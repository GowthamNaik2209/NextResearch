// The price store's gate in front of the database (./store.ts): a few reads at a time per server
// instance, a deadline per read, and a short pause after a read misses it.
//
// A read that misses its deadline isn't cancelled (Prisma can't abort a query): it keeps its database
// connection until Postgres answers. So its turn is handed on only when the query really ends, or
// the gate would start new reads on a pool already full of slow ones and every read queued behind
// them would miss its deadline too. After a miss the store is left alone for a while (the callers
// fetch Yahoo instead), and the reads already waiting for a turn give up at once.

export class ReadTimedOut extends Error {
  constructor(ms: number) {
    super(`price store: read timed out after ${ms} ms`);
  }
}

/** The store is pausing after a slow read: the caller goes to Yahoo, and nothing is logged. */
export class StorePaused extends Error {
  constructor() {
    super("price store: pausing after a slow read");
  }
}

export type ReadGateOptions = {
  /** Reads running at once. */
  atOnce: number;
  /** A read slower than this is given up on (the query itself keeps running). */
  timeoutMs: number;
  /** How long the store is skipped after a read times out. */
  pauseMs: number;
  /** A query that never answers gives its turn back after this long anyway, so the gate can't stay shut. */
  holdMaxMs: number;
  now?: () => number;
};

export function createReadGate(o: ReadGateOptions) {
  const now = o.now ?? Date.now;
  let running = 0;
  let pausedUntil = 0;
  // Each waiter is told whether it got a turn (true) or the store paused while it waited (false).
  const waiting: ((gotTurn: boolean) => void)[] = [];

  const paused = () => now() < pausedUntil;

  // A finished read hands its turn straight to the next waiter (so no new caller slips in between).
  function handOn() {
    const next = waiting.shift();
    if (next) next(true);
    else running--;
  }

  function pause() {
    pausedUntil = now() + o.pauseMs;
    for (const w of waiting.splice(0)) w(false);
  }

  async function run<T>(read: () => Promise<T>): Promise<T> {
    if (paused()) throw new StorePaused();
    if (running < o.atOnce) running++;
    else if (!(await new Promise<boolean>((r) => waiting.push(r)))) throw new StorePaused();
    // Handed a turn, but a pause began before this read resumed: pass the turn on and skip.
    else if (paused()) {
      handOn();
      throw new StorePaused();
    }

    let p: Promise<T>;
    try {
      p = read();
    } catch (e) {
      handOn();
      throw e;
    }
    let handedOn = false;
    const done = () => {
      if (handedOn) return;
      handedOn = true;
      clearTimeout(hold);
      handOn();
    };
    const hold = setTimeout(done, o.holdMaxMs);
    hold.unref?.();
    p.then(done, done);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const late = new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new ReadTimedOut(o.timeoutMs)), o.timeoutMs)));
    try {
      return await Promise.race([p, late]);
    } catch (e) {
      if (e instanceof ReadTimedOut) pause();
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  return { run, paused, get running() { return running; }, get waiting() { return waiting.length; } };
}
