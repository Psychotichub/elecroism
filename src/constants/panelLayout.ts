export const PANEL_DEFAULT_WIDTH = {
  sidebar: 224,
  inspector: 320,
} as const;

export const PANEL_WIDTH_LIMITS = {
  sidebar: { min: 180, max: 400 },
  inspector: { min: 260, max: 480 },
} as const;

/** Slim category rail when the palette is collapsed. */
export const PALETTE_RAIL_WIDTH = 40;

/** Drag below this width snaps the palette to the icon rail. */
export const SIDEBAR_RAIL_SNAP_THRESHOLD = 120;

export function clampPanelWidth(
  value: number,
  panel: keyof typeof PANEL_WIDTH_LIMITS
): number {
  const { min, max } = PANEL_WIDTH_LIMITS[panel];
  return Math.min(max, Math.max(min, Math.round(value)));
}
