# UI breakpoints & responsive shell

ElectroSim uses a small set of layout breakpoints aligned with the schematic editor shell (menu, toolbar, canvas, palette, inspector).

## Breakpoints

| Name | Query | Behaviour |
|------|--------|-----------|
| **Narrow layout** | `max-width: 899px` | Palette auto-collapses to the icon rail; inspector opens as a full-work-area overlay instead of a side column. |
| **Tablet touch** | `min-width: 768px` + coarse pointer or multi-touch | Minimum **40×40px** interactive targets on chrome controls (toolbar, menu, palette rail, sheet tabs, zoom controls). |
| **Status bar detail** | `min-width: 900px` | Wire-mode readout visible in the status bar (`es-status-wire-modes`). |

Constants live in `src/design/breakpoints.ts`:

- `NARROW_LAYOUT_MAX_PX` — `900`
- `NARROW_LAYOUT_MEDIA` — `(max-width: 899px)`
- `TABLET_TOUCH_TARGET_MIN_PX` — `40`

## Narrow layout (< 900px)

Implemented in `src/hooks/useResponsiveLayout.ts` and `src/App.tsx`.

1. **Palette** — Collapses automatically when the viewport crosses into narrow width. The slim icon rail stays in the layout; opening a category or choosing “Show component palette” presents the full palette as a **left drawer overlay** with backdrop dismiss.
2. **Inspector** — The right splitter and fixed-width column are hidden. When the inspector is shown, it covers the **entire work area** (canvas region) as a modal overlay with a close control and backdrop dismiss.
3. **Splitters** — Left/right panel splitters are not rendered in narrow mode (resize is desktop-only).

Root attributes set on the app shell:

- `data-narrow-layout="true"` when narrow layout is active
- `data-touch-targets="coarse"` when tablet touch sizing applies

## Tablet touch targets (≥ 40px)

When `data-touch-targets="coarse"` is present, `src/index.css` enlarges chrome controls via the `.es-touch-target` utility and scoped selectors (toolbar icon buttons, menu triggers, palette rail, sheet tabs, canvas zoom controls, PWA install banner actions).

Detection uses `isTabletLike()` in `src/utils/tabletDisplay.ts` (coarse pointer or multi-touch, at least 768px wide).

## PWA install banner

`WebInstallBanner` uses design-system `Button` / `IconButton` primitives and `es-*` surface tokens so it matches the shell in both themes and inherits coarse-touch sizing.

## Testing

- `src/hooks/__tests__/useNarrowLayout.test.ts` — media-query subscription
- `src/hooks/__tests__/useResponsiveLayout.test.ts` — palette auto-collapse on narrow entry
- `src/utils/__tests__/tabletDisplay.test.ts` — tablet detection heuristic

## Related files

- `src/App.tsx` — shell layout and overlay mounting
- `src/components/layout/NarrowLayoutOverlays.tsx` — palette / inspector overlays
- `src/components/Panels/StatusBar.tsx` — `min-[900px]` wire-mode visibility
