// Tiny in-memory TTL cache + in-flight de-dupe for upstream fetches. Per server
// instance only — the API routes additionally send s-maxage so a CDN can share.
const store = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const running = inflight.get(key);
  if (running) return running as Promise<T>;
  const p = load()
    .then((value) => {
      // A failed (null) load is only remembered for a minute so an upstream
      // rate-limit/blip doesn't pin "no data" for the full TTL.
      store.set(key, { at: value == null ? Date.now() - ttlMs + Math.min(ttlMs, 60_000) : Date.now(), value });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
