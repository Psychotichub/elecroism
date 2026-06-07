/** Heuristic for tablet-class touch devices (iPad, Android tablets, large touch laptops). */
export function isTabletLike(): boolean {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const touch = navigator.maxTouchPoints > 1;
  const wide = window.matchMedia('(min-width: 768px)').matches;
  return wide && (coarse || touch);
}

/** Request fullscreen for installed / tablet web sessions (requires user gesture). */
export async function requestTabletFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  if (!document.fullscreenEnabled) return false;
  if (document.fullscreenElement) return true;

  try {
    await document.documentElement.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}
