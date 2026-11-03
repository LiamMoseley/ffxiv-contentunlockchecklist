import type { Clock } from "../log";

/** Clock adapter that reads the system time. */
export const systemClock: Clock = { now: () => new Date() };
