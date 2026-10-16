// Tiny in-memory TTL cache + in-flight de-dupe for upstream fetches. Per server
// instance only — the API routes additionally send s-maxage so a CDN can share.
const store = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, { at: number; promise: Promise<unknown> }>();

// Loaders have their own timeouts, but if one ever hangs, sharing its promise would hang every
// later caller for that key too; after this long a new caller starts a fresh load instead.
export const INFLIGHT_MAX_MS = 30_000;

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const running = inflight.get(key);
  if (running && Date.now() - running.at < INFLIGHT_MAX_MS) return running.promise as Promise<T>;
  const entry = { at: Date.now(), promise: Promise.resolve() as Promise<unknown> };
  const p = load()
    .then((value) => {
      // A failed (null) load is only remembered for a minute so an upstream
      // rate-limit/blip doesn't pin "no data" for the full TTL.
      store.set(key, { at: value == null ? Date.now() - ttlMs + Math.min(ttlMs, 60_000) : Date.now(), value });
      return value;
    })
    .finally(() => {
      if (inflight.get(key) === entry) inflight.delete(key);
    });
  entry.promise = p;
  inflight.set(key, entry);
  return p;
}
