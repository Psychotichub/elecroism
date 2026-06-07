/** Viewport at or below this width uses narrow shell layout (collapsed palette, inspector overlay). */
export const NARROW_LAYOUT_MAX_PX = 900;

/** CSS media query for narrow layout — use with `window.matchMedia`. */
export const NARROW_LAYOUT_MEDIA = `(max-width: ${NARROW_LAYOUT_MAX_PX - 1}px)`;

/** Minimum interactive target size for tablet / coarse-pointer layouts (WCAG 2.5.5). */
export const TABLET_TOUCH_TARGET_MIN_PX = 40;
