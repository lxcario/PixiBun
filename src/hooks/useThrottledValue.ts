import { useEffect, useRef, useState } from 'react';

/**
 * `value`, passed through at most once every `ms` while it keeps changing.
 * The first change after a quiet spell shows at once and the last change
 * always lands, so a single edit (Undo, a fill) still feels immediate while
 * a stroke no longer redraws secondary previews on every frame.
 */
export function useThrottledValue<T>(value: T, ms: number): T {
  const [shown, setShown] = useState(value);
  const lastShownAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Object.is(value, shown)) return;
    const wait = lastShownAt.current + ms - performance.now();
    const show = () => {
      timer.current = null;
      lastShownAt.current = performance.now();
      setShown(value);
    };
    if (wait <= 0) {
      show();
      return;
    }
    timer.current = setTimeout(show, wait);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [ms, shown, value]);

  return shown;
}
