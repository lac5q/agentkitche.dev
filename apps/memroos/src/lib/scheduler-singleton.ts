import { existsSync, mkdirSync, openSync, writeFileSync, readFileSync, closeSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import { homedir } from 'node:os';

/**
 * Cross-process singleton lock for the in-process memory schedulers.
 * If a second memroos process boots while the first is still alive, only the
 * holder of the lockfile starts the consolidation/decay timers. The losing
 * process still serves HTTP — it just doesn't double-schedule cron work.
 *
 * Stale lockfiles (PID no longer exists) are reclaimed automatically.
 */
const LOCK_PATH = process.env.MEMROOS_SCHEDULER_LOCK
  ?? `${homedir()}/.memroos/run/scheduler.lock`;

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function tryAcquireSchedulerLock(): boolean {
  try {
    mkdirSync(dirname(LOCK_PATH), { recursive: true });
  } catch {
    // best-effort
  }

  if (existsSync(LOCK_PATH)) {
    try {
      const existing = parseInt(readFileSync(LOCK_PATH, 'utf8').trim(), 10);
      if (Number.isFinite(existing) && existing !== process.pid && pidAlive(existing)) {
        console.log(`[scheduler-lock] another memroos pid=${existing} holds the lock — skipping schedulers`);
        return false;
      }
      // stale lock — reclaim
      unlinkSync(LOCK_PATH);
    } catch {
      // unreadable; treat as stale
      try { unlinkSync(LOCK_PATH); } catch { /* ignore */ }
    }
  }

  try {
    // O_EXCL create; if another process wins the race, this throws EEXIST.
    const fd = openSync(LOCK_PATH, 'wx');
    writeFileSync(fd, String(process.pid));
    closeSync(fd);
  } catch {
    return false;
  }

  const release = () => {
    try {
      const owner = parseInt(readFileSync(LOCK_PATH, 'utf8').trim(), 10);
      if (owner === process.pid) unlinkSync(LOCK_PATH);
    } catch { /* ignore */ }
  };
  process.on('exit', release);
  process.on('SIGINT', () => { release(); process.exit(0); });
  process.on('SIGTERM', () => { release(); process.exit(0); });
  return true;
}
