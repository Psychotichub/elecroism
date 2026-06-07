import { useEffect, useState } from 'react';
import { NARROW_LAYOUT_MEDIA } from '../design/breakpoints';

function readNarrowLayout(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(NARROW_LAYOUT_MEDIA).matches;
}

/** True when viewport width is below the narrow layout breakpoint (900px). */
export function useNarrowLayout(): boolean {
  const [narrow, setNarrow] = useState(readNarrowLayout);

  useEffect(() => {
    const mq = window.matchMedia(NARROW_LAYOUT_MEDIA);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return narrow;
}
