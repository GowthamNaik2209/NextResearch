// Waiting a bounded time for something still being built (the covered-stock panel, ./data.ts).
export const PENDING = Symbol("pending");

/** `p`'s result, or PENDING when it takes longer than `ms`. `p` carries on either way. */
export function waitUpTo<T>(p: Promise<T>, ms: number): Promise<T | typeof PENDING> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([p, new Promise<typeof PENDING>((r) => (timer = setTimeout(() => r(PENDING), ms)))]).finally(() => clearTimeout(timer));
}
