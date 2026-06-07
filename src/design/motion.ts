/** Motion durations — mirror CSS `--es-motion-*` tokens. */
export const MOTION = {
  fast: 100,
  normal: 150,
  slow: 300,
} as const;

/** Tailwind-friendly motion utility class names. */
export const MOTION_CLASS = {
  transitionColors:
    'transition-colors duration-[var(--es-motion-normal)] motion-reduce:transition-none',
  transitionAll:
    'transition-all duration-[var(--es-motion-normal)] ease-out motion-reduce:transition-none',
  panelCollapse:
    'transition-[width] duration-[var(--es-motion-normal)] ease-out motion-reduce:transition-none',
  tabCrossfade: 'es-tab-crossfade',
  dialogBackdrop: 'es-dialog-backdrop',
  dialogPanel: 'es-dialog-panel',
  simulatePulse: 'es-simulate-pulse',
  badgeBump: 'es-badge-bump',
} as const;

/** @deprecated Prefer `MOTION_CLASS.transitionColors`. */
export function motionClass(property = 'transition-colors'): string {
  if (property === 'transition-colors') return MOTION_CLASS.transitionColors;
  if (property === 'transition-all') return MOTION_CLASS.transitionAll;
  return `${property} duration-[var(--es-motion-normal)] motion-reduce:transition-none`;
}
