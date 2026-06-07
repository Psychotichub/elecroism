# ElectroSim — Improvement Ideas (Round 4)

Date: 2026-06-07

This backlog builds on Round 3 (`project_improvement_ideas_v3.md`). Rounds 1–3 shipped
simulation depth, deliverables, tutorials, classroom mode, and glossary. Round 4 focuses
on **visual design and UX polish** — a coherent CAD-grade interface (“quiet workshop”:
canvas-first, token-driven chrome, one accent colour) on desktop, PWA, and exports.

Legend: ❌ not started · ⚠️ partial · ✅ done

---

## A. Design System & Tokens

### ✅ A1. CSS Token Layer
Replace ad hoc hex and Tailwind strings with theme-scoped CSS variables.
- `src/styles/tokens.css` — `--es-surface-*`, `--es-text-*`, `--es-accent`, semantic colours per `data-theme`. ✅
- Tailwind `es-*` colour map in `tailwind.config.js`. ✅
- `themeStore` `themeColors` adapter + `design/tokens.ts` hex mirror for Konva canvas. ✅
- `useThemeTokens()` hook bundles classes + canvas hex. ✅

### ✅ A2. UI Primitives Library
Shared components in `src/components/ui/` for new and migrated UI.
- `Button`, `IconButton`, `Input`, `Select`, `Textarea`, `Badge`, `Chip`, `Tabs`, `Dialog`, `SegmentedControl`. ✅
- `es-focus-ring`, typography utilities (`es-typo-*`) in `index.css` `@layer components`. ✅
- Rollout rule: new UI uses primitives; migrate panels incrementally. ⚠️ one dialog migrated

### ✅ A3. Typography & Spacing Rollout
Inter type scale applied across inspector chrome, status bar, property editors, and validation tables.
- `es-typo-caption` / `body-sm` / `label` / `section` / `title-sm` in `PropertyPanel`, `StatusBar`, `CircuitValidationPanel`, `propertyPanel/*`. ✅
- `es-tabular-nums` on status bar metrics, property simulation readout, validation table numerics. ✅
- `data-density="comfortable"` via `uiStore.uiDensity` + `es-density-*` spacing utilities (`es-form-field`, `es-density-stack`). ✅
- `src/design/typography.ts` exports class name map for implementers. ✅

### ✅ A4. Icon Map & Toolbar Icons
Central semantic icon map with consistent sizing across toolbar and inspector chrome.
- `src/design/icons.ts` + `AppIcon.tsx` — semantic map (simulate, validation, learning, export, tools, theme). ✅
- `src/design/customToolIcons.tsx` — 16×16 select / wire / pan CAD glyphs. ✅
- `AppIcon` component + `ICON_SIZES` (14 inline · 16 toolbar · 18 panel); `es-icon-*` CSS wrappers on `IconButton` / `SegmentedControl`. ✅
- Toolbar, slot meta, learning dropdowns, sheet tabs, validation severity icons migrated. ✅

### ✅ A5. Motion & Feedback
Token-driven motion with `prefers-reduced-motion` fallbacks across shell feedback points.
- `design/motion.ts` — `MOTION` durations + `MOTION_CLASS` utilities (`panelCollapse`, `tabCrossfade`, `dialog*`, `simulatePulse`, `badgeBump`). ✅
- CSS `--es-motion-fast/normal/slow` + keyframes in `index.css`; animations disabled under reduced motion. ✅
- Sidebar / inspector width collapse (`App.tsx`), inspector tab cross-fade, `Dialog` open, simulate CTA pulse, validation tab badge bump (`Tabs` / `Badge`). ✅
- No heavy blur/glass on canvas frame. ✅ (by policy)

---

## B. Application Chrome

### ✅ B1. Toolbar Refresh
Slim bar keeps drawing tools and simulate; menu bar holds the rest.
- Segmented control for Select / Wire / Delete / Pan (`SegmentedControl`). ✅
- Primary **Simulate** CTA (`Button` variant primary); `run-simulation` filtered from slot duplicates. ✅
- Customizable slots as `IconButton` with shortcuts; built-in tools/theme hidden from slot row. ✅
- Menu bar + dropdown token styling (`es-menu-*`); theme removed from toolbar. ✅

### ✅ B2. Menu Bar & View → Appearance
Token-styled menu bar with grouped learning content and a full Appearance panel.
- Lighter menu bar; `surface-chrome-2` dropdowns with `es-lg` radius. ✅ (`es-menu-bar` / `es-menu-panel`)
- **Insert → Learning** submenu groups Tutorials, Challenges, Classroom with `AppIcon` glyphs. ✅
- **View → Appearance** — theme, density, show sheet tab bar (`uiStore.showSheetTabBar`). ✅

### ✅ B3. Sheet Tabs
Browser-style tabs; project name not duplicated in tab row.
- Inactive on `chrome-2`; active tab visually connects to canvas lift (not solid blue fill).
- Unsaved dot per sheet; project name in status bar / window title only.

### ✅ B4. Status Bar Zones
Single strip mixes command line, metrics, and brand.
- **Left** — mode / CAD command; **center** — simulation metrics (tabular nums); **right** — faults, integrity, runtime mode.
- Small logomark + “ElectroSim” on wide screens only.

### ✅ B5. Draggable Splitters
Palette and inspector collapse uses `<` / `>` text gutters.
- 1px hit area, 5px drag handle; double-click reset width.
- Collapsed palette → slim icon rail by category (not zero-width).

### ✅ B6. Inspector Tab Overflow
Eight equal tabs (Properties, Layers, Validation, TCC, Scope, BMS, Cable, Legend) crowd a 320px strip.
- **Primary tabs:** Properties · Validation · Layers.
- **Analysis** overflow: TCC, Scope, BMS, Cable, Legend.
- Validation badge count; Properties tab shows selection summary when narrow (`M1 · Motor`).
- `Tabs` primitive wired in `InspectorColumn` with Analysis overflow menu.

---

## C. Panels & Inspector

### ✅ C1. Property Panel Sections
Long scroll with repeated `border-b` headers; help text is a wall on select.
- `Section` accordions: Electrical, Mechanical, BMS, Documentation.
- Selection **header card**: label, type, layer, energized/fault mini-status from simulation.
- Inline `?` popover from `getComponentPanelDescription()` instead of full help block.

### ✅ C2. Sidebar / Palette Polish
Component list is functional but visually flat.
- Sticky section headers with `es-typo-label` + chevron animation.
- 32px rows; symbol thumbnail; `/` focuses search; match highlighting.
- Favourites row distinct from category `Chip` filters.

### ✅ C3. Validation & Cable Table Styles
Issue rows and export tables vary per panel.
- Shared **issue row**: severity stripe, message, focus action.
- Zebra rows, sticky headers, right-aligned numbers.
- Sticky footer for export actions inside panel.

### ✅ C4. Glossary & Legend Panel Polish
Legend tab ships; visual pass pending token migration.
- `CatalogMetaChips` → shared `Chip` primitive.
- Legend export footer uses `Button` secondary; table uses shared table styles.

---

## D. Overlays & Dialogs

### ✅ D1. Dialog Shell Migration
`Dialog` primitive provides header / scroll body / footer.
- `ExportAssignmentDialog` migrated. ✅
- Migrate: `GradeSubmissionsDialog`, `PrivacySettingsDialog`, `ShortcutSettingsDialog`, `ProjectSettingsDialog`, `CommandPalette` shell. ✅

### ✅ D2. Command Palette Visual Refresh
Functional but dense; does not use tokens or typography scale.
- Category separators; recent actions; `es-typo-body` sizing.
- Max-width `lg`; keyboard focus matches `es-focus-ring`.

### ❌ D3. Dockable Learning Panels
Tutorial, Challenge, and Assignment panels are fixed `bottom-14 right-4` cards.
- Slide-over drawer or dock below inspector; pin / minimize.
- Persist position in `uiStore`; learning accent border (`--es-semantic-learning`).
- Shared `Card` primitive.

### ❌ D4. Tooltip Component
Most hints use native `title=` only.
- Consistent delay, keyboard access, token-styled tooltip for toolbar and palette.

---

## E. Canvas & Brand

### ⚠️ E1. Canvas Surface Tokens
Dark canvas `#1a1d24`, light `#f4f5f7`; grid dot from `design/tokens.ts`. ✅
- Zoom controls floating bottom-left with token styling. ❌
- `ValidationHintsOverlay` softer callout bubble + pointer. ❌

### ❌ E2. Selection & Wire Preview Colours
Selection highlight should match UI `--es-accent` on light and dark canvas.
- Wire preview / marquee contrast audit on light canvas.
- Do not override IEC symbol fill/stroke from UI theme. ✅ (by policy)

### ❌ E3. Schematic Symbol Stroke Scale
Perceived quality tied to canvas glyphs, not just chrome.
- Consistent stroke width at zoom levels.
- Symbol legend / PDF typography aligned with `es-typo-body-sm`.

### ❌ E4. Light Theme Rebuild
Light mode works but panels lack depth.
- `#ffffff` panels on `#f4f5f7` canvas; borders via `border-subtle` + light shadow.
- Sidebar / inspector QA pass.

### ❌ E5. High-Contrast & System Theme
HC theme ships; full primitive audit pending.
- Focus rings on all `ui/*` controls; fault red vs yellow accent distinguishable.
- `prefers-color-scheme` on first launch; optional Electron `nativeTheme` sync.

### ❌ E6. Logomark & Export Identity
Status bar shows plain “⚡ ElectroSim” text.
- SVG logomark; favicon / PWA icon alignment.
- PDF title block font sizes match UI token scale.

---

## F. Quality & Tooling

### ❌ F1. UI Gallery / Visual Regression
No Storybook or dev-route screenshot baseline yet.
- `UiGallery` route or Playwright screenshots: menu, toolbar, inspector, dialog (dark + light).
- CI optional gate on shell chrome.

### ❌ F2. ESLint Raw Colour Ban
New panels still add inline `bg-blue-600` outside `components/ui`.
- Rule: discourage raw Tailwind accent colours outside `src/components/ui/`.

### ❌ F3. Responsive & PWA Layout
`WebInstallBanner` uses tokens partially; narrow layout untested.
- `< 900px`: auto-collapse palette; inspector full-screen overlay.
- Tablet touch targets ≥ 40px; document in `docs/ui-breakpoints.md`.

---

## Suggested Priority (next 6)

1. **B6 Inspector tab overflow** — highest daily friction; `Tabs` primitive is ready.
2. **D1 Dialog migration** — unify modals on `Dialog` + `Button`; quick visual win.
3. **B3 Sheet tabs** — browser-style tabs improve “real app” feel.
4. **B4 Status bar zones** — engineering numerals + clearer simulation readout.
5. **C1 Property panel sections** — longest-scroll UI; accordions + header card.
6. **B5 Draggable splitters** — expected CAD affordance; replace chevron gutters.

---

## Notes for implementers

- Vision: **quiet workshop** — canvas is calmest region; colour reserved for state (active tool, fault, validation, learning).
- Keep **canvas symbol colours** IEC-standard; UI tokens must not leak into `*Symbol.tsx` except selection highlight.
- `themeColors` in `themeStore.ts` stays as a thin adapter until all chrome uses `es-*` classes; then deprecate.
- Prefer **one accent** (`--es-accent`); map export / challenge / success actions to semantic tokens, not new button colours.
- New UI must use `src/components/ui/*`; migrate existing panels only in focused passes (inspector, dialogs, property).
- When touching layout shell, capture Playwright before/after screenshots if **F1** is not yet automated.
- Round 4 does not reopen Round 3 **G1–G3** (i18n, RTL, live regions) unless a panel migration needs an ARIA fix.
- Out of scope: full Figma handoff, Konva replacement, glassmorphism, single-PR rewrite of every panel.
