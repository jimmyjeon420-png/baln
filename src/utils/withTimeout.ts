/**
 * Wraps a promise (or PromiseLike) with a timeout.
 * Rejects if the promise doesn't resolve within the given time.
 *
 * Accepts PromiseLike to support Supabase query builders which are
 * thenable but not true Promise instances.
 */
export const withTimeout = <T>(
  promise: PromiseLike<T>,
  ms: number = 10000,
  label?: string
): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout${label ? `: ${label}` : ''} after ${ms}ms`)),
        ms
      )
    ),
  ]);
};
