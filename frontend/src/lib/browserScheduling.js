export function scheduleIdleTask(callback, options = {}) {
  const { timeout = 1500, fallbackDelay = 1 } = options;

  if (typeof window === 'undefined') {
    return () => {};
  }

  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(callback, { timeout });
    return () => {
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }

  const timeoutId = window.setTimeout(() => {
    callback({
      didTimeout: true,
      timeRemaining: () => 0
    });
  }, fallbackDelay);

  return () => window.clearTimeout(timeoutId);
}
