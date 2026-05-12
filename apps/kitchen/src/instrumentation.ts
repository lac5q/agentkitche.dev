export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { tryAcquireSchedulerLock } = await import('./lib/scheduler-singleton');
    if (!tryAcquireSchedulerLock()) {
      // Another kitchen process owns the schedulers; serve HTTP only.
      return;
    }
    const { startConsolidationScheduler } = await import('./lib/memory-consolidation');
    const { startDecayScheduler } = await import('./lib/memory-decay');
    const { prewarmResponseCaches } = await import('./lib/response-cache');
    startConsolidationScheduler();
    startDecayScheduler();
    void prewarmResponseCaches();
  }
}
