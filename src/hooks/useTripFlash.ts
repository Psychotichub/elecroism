import { useEffect, useRef, useState } from 'react';

/**
 * Blinking visibility while `isTripped` is true (breaker / fuse trip indicator).
 * Interval id is stored in a ref so cleanup is explicit under React Strict Mode.
 */
export function useTripFlash(isTripped: boolean, intervalMs: number): boolean {
  const [flashVisible, setFlashVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isTripped) {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      queueMicrotask(() => setFlashVisible(true));
      return;
    }

    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setFlashVisible((v) => !v);
    }, intervalMs);

    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTripped, intervalMs]);

  return flashVisible;
}
