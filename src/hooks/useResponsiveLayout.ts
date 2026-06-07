import { useEffect, useRef, useState } from 'react';
import { useNarrowLayout } from './useNarrowLayout';
import { useUiStore } from '../store/uiStore';
import { isTabletLike } from '../utils/tabletDisplay';

function readTabletTouch(): boolean {
  return isTabletLike();
}

/**
 * Applies narrow-layout shell rules and exposes layout flags for the app root.
 * - On entering narrow width: auto-collapse the component palette.
 * - Tablet touch flag drives 40px minimum targets via `data-touch-targets`.
 */
export function useResponsiveLayout(): { narrow: boolean; tabletTouch: boolean } {
  const narrow = useNarrowLayout();
  const [tabletTouch, setTabletTouch] = useState(readTabletTouch);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const wasNarrow = useRef(false);

  useEffect(() => {
    if (narrow && !wasNarrow.current) {
      setSidebarCollapsed(true);
    }
    wasNarrow.current = narrow;
  }, [narrow, setSidebarCollapsed]);

  useEffect(() => {
    const onResize = () => setTabletTouch(isTabletLike());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return { narrow, tabletTouch };
}
