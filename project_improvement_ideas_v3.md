# ElectroSim — Improvement Ideas (Round 3)

Date: 2026-06-07

This backlog builds on Round 1 (`project_improvement_ideas.md`) and Round 2
(`project_improvement_ideas_v2.md`). Those rounds are effectively complete: simulation
depth, deliverables, persistence, performance, accessibility, tutorials, and challenge
mode are all shipped. Round 3 focuses on **polish, scale, and product maturity** —
turning ElectroSim from a powerful desktop editor into something teams can rely on daily.

Legend: ❌ not started · ⚠️ partial · ✅ done

---

## A. Simulation & Engineering (next depth)

### ✅ A1. Motor Thermal / Duty-Cycle Model
Transient scope shows inrush; add a simple thermal integrator.
- I²t heating during start, cool-down during run, trip on overload curve overlap. ✅ `motorThermal.ts` + timeline integration
- Tie to existing TCC / protection coordination data. ✅ overload relay / MPCB / MCB thermal trip curves (IEC 60947-4-1 class 10/20/30)
- Show a motor “thermal %” readout in Properties and on the scope. ✅ `MotorThermalReadout` + scope **thermal** channel

### ✅ A2. ATS / Generator Transfer Sequences
`ats` and source components exist; add timed sequence simulation.
- Configurable transfer delay, interlock, and “open transition” vs “closed transition”. ✅ selector `atsController` props + open/closed timing
- Step-through timeline: utility fail → gen start → transfer → retransfer. ✅ `ats_transfer` oscilloscope scenario + phase readout
- Validation flags impossible sequences (both sources closed, etc.). ✅ `validateAtsInstallation` in design validation

### ✅ A3. Cable Derating & Installation Method
Cable wizard sizes by ampacity; add real-world derating.
- Ambient temperature, grouping factor, soil/duct method from a lookup table. ✅ `groupingDerating`, `buried_duct`, `computeDeratingBreakdown`
- Adjust wizard recommendation and flag when nominal size is insufficient after derating. ✅ `validateCableDerating` in design validation; wizard applied-wire warning
- Persist derating inputs on `Wire.cableSizing`. ✅ `circuitsInGroup`, `derating*K` fields on `WireCableSizing`

### ✅ A4. DC Systems & Battery / UPS Paths
Extend the engine beyond AC-dominated flows.
- DC source, battery string, charger, UPS static bypass as first-class simulation paths. ✅ `dcPowerPaths.ts`; battery seeds; UPS inverter/bypass; `dcUpsBackup` example
- DC fault current estimate (simplified) for battery-backed circuits. ✅ `dcFaultCurrent.ts`; `maxDcFaultCurrentA` on `SimulationResult`
- Distinct wire color / labeling rules for DC in exports. ✅ `dcWireLabeling.ts`; wire schedule `dcPolarity` / `exportColorLabel`; design validation colour hints

### ✅ A5. Coordination Study Report (PDF)
TCC plotter and coordination table exist; package them for handoff.
- One-click PDF: TCC curves, device settings table, fault levels, margin notes. ✅ `coordinationStudyReport.ts`; File menu + Validation panel export
- Include project title block and sheet index when multi-sheet. ✅ reuses `drawPdfTitleBlock` / `drawPdfSheetIndexPage`

---

## B. Editor & UX

### ✅ B1. Desktop Menu Bar (File / Edit / View / Window)
Moved crowded toolbar actions into a standard top menu bar.
- **File**, **Edit**, **Insert**, **View**, **Simulate**, **Window** with nested submenus. ✅ `AppMenuBar.tsx`
- Slim toolbar keeps drawing tools and simulate. ✅ `Toolbar.tsx`

### ✅ B2. Native Electron Menu Sync
Native OS menu mirrors the in-app bar via a shared menu definition.
- `shared/nativeMenu.json` — single source for File/Edit/View/Simulate/Window/Help actions and accelerators. ✅
- `electron/appMenu.cjs` — `Menu.setApplicationMenu`, About dialog, check-for-updates, `menu-action` IPC. ✅
- `src/menu/executeMenuAction.ts` + `useElectronMenuBridge` — renderer dispatcher for native and in-app menus. ✅
- `AppMenuBar.tsx` — static items use `menuActionNode()` from the same action ids. ✅

### ✅ B3. Customizable Shortcuts & Toolbar
Power users can rebind shortcuts and curate toolbar favorites.
- `ShortcutSettingsDialog` — search, rebind (key capture), per-action and reset-all. ✅
- Eight customizable toolbar slots (defaults: undo, redo, simulate, fit, palette, snap, PDF, theme). ✅
- `shortcutStore` persists bindings and slots to `localStorage`. ✅
- `useGlobalEditorShortcuts` dispatches via `executeShortcutAction` + registry. ✅

### ✅ B4. Drawing Layers
Power, control, and instrumentation artwork on togglable drawing layers.
- Inspector **Layers** tab: visibility, lock, color wash, active layer, PDF include. ✅
- `drawingLayer` on components/wires with type/style inference. ✅
- Canvas respects visibility/lock; “Select on active layer only” mode. ✅
- PDF export hides layers marked “Include in PDF” off via `drawingLayerStage`. ✅

### ✅ B5. Cross-Sheet Navigation
Cross-sheet references are actionable across multi-sheet projects.
- `=SheetName!` / `=Sheet2!Q1` syntax on labels, `crossSheetRef`, and wire tags. ✅
- Click label or **Go** in Properties → switch sheet and frame target/region. ✅
- Inspector **References to this sheet** backlinks (Properties tab). ✅
- Broken reference checks merged into Validation panel. ✅

### ✅ B6. Snapshot Diff / Revision Compare
Snapshots can be compared against the current project with overlay, side-by-side preview, and export.
- `projectSnapshotDiff.ts` — per-sheet added/removed/moved/modified components and wires. ✅
- **Compare** in Validation → Snapshots opens diff dialog + canvas overlay with wire markers. ✅
- **Side by side** mini-preview (base vs current) per sheet with color-coded changes. ✅
- Rename revision labels (e.g. Rev B); **Export summary** downloads `.txt` report. ✅

### ✅ B7. Drag-and-Drop Project Open
- Drop `.eproj` / `.esim` / `.json` onto the window to open (browser + Electron). ✅
- `useProjectFileDrop` + drop overlay; palette component drags are ignored. ✅
- **File → Open Recent** in app menu + native Electron menu (IndexedDB copy + path when available). ✅

---

## C. Deliverables & Reporting

### ✅ C1. Documentation Pack Export
One action downloads a ZIP for the client (active sheet).
- **File → Documentation pack (ZIP)** or Validation → Drawing export → **Documentation pack**. ✅
- Includes drawing PDF, wire/BOM/terminal/cable CSVs, coordination study PDF (when devices exist). ✅
- `README.txt` manifest lists contents, project, sheet, and export timestamp. ✅

### ✅ C2. Panel / MCC Schedule
Panel lineup auto-generated from placed devices on the active sheet.
- `panelScheduleExport.ts` — Pos, tag, type, rating, cable ref, notes (left-to-right order). ✅
- **Validation → Panel / MCC schedule** — CSV + PDF export. ✅
- **File → Panel schedule CSV / PDF** in app and native menus. ✅

### ✅ C3. Simplified Single-Line Diagram (SLD) View
- **View → Single-line diagram (SLD)** or Validation panel toggle — blocks + straight wires. ✅
- Wire bend grips hidden; junctions as dots, busbars as bars; layer colour coding. ✅
- **Export SLD PDF** captures simplified view (auto-enables SLD briefly if off). ✅
- Display-only mode — detailed schematic data unchanged when toggled off. ✅

### ✅ C4. Title Block & Revision Block Editor
Title block fields exist in export; make them editable in-app.
- **File → Project settings…** — client, drawing number, rev, scale, approval signatures. ✅
- Applies across all sheets; revision history table on exported PDF title blocks (last four entries). ✅
- Validation panel drawing export section links to project settings; legacy per-sheet fields migrate on load. ✅

---

## D. Collaboration & Ecosystem

### ✅ D1. Canvas Annotations & Review Comments
- Pin comments to components (**Pin on selection**) or canvas coordinates (**Pin at pointer**). ✅
- Numbered pins on canvas; thread list with reply, resolve, reopen, and delete. ✅
- **Validation → Review comments** panel; active thread highlights on canvas. ✅
- **File → Review comments PDF / JSON** exports review sheet appendix. ✅

### ✅ D2. Component Library Cloud / Pack Registry
`.elib.json` import/export works locally; add discovery.
- Curated starter packs (IEC symbols, motor starters, BMS I/O) with GitHub Release URLs + in-app bundled fallback. ✅
- **File → Get library packs…** browser with version/compatibility check, merge or replace install. ✅
- Remote registry manifest at `public/library-pack-registry.json` (refreshable from GitHub raw). ✅

### ✅ D3. Plugin / Extension API (v1)
- Register custom component types + property editors + simulation behavior via JSON `.eplugin.json` manifests (`plugins/README.md`).
- Sandboxed: rejects executable keys; models `pass_through`, `resistive_load`, `open` only (no WASM in v1).
- Example pack: `public/plugins/example-warning-beacon.eplugin.json`; load via Circuit validation → Plugins section.

### ✅ D4. Organization Templates
- Branded project templates via `.orgtemplate.json`: logo, title block, standard sheets, device library (`templates/README.md`).
- **File → New from template** submenu with bundled Panel Shop Standard + load custom template file.
- PDF title blocks use `brandName`; logo preview in Project settings.

---

## E. Quality, Testing & Operations

### ✅ E1. Electron UI Smoke Tests
Unit tests are strong; thin Playwright E2E layer in `e2e/` (`npm run test:smoke` after `npm run build`).
- Launch Electron, load example circuit, run simulation, export PNG (no canvas error).
- CI: `smoke-electron` on Windows; `smoke-electron-mac` on release tags.

### ✅ E2. Menu & Panel Interaction Tests
- RTL tests for `AppMenuBar`: File → New, Insert → Examples, Window → palette toggle, shortcut hints.
- `shortcutMenuRegression.test.ts`: default bindings + `useGlobalEditorShortcuts` Ctrl+N / Ctrl+K dispatch.

### ✅ E3. Opt-In Crash / Error Reporting
- Opt-in toggle in Window → Privacy & diagnostics (`errorReportingStore`, `PrivacySettingsDialog`).
- Sentry store API when `VITE_SENTRY_DSN` is set; scrub project names/paths (`errorReportScrubber`).
- Offline localStorage queue + flush on reconnect (`errorReporting.ts`, wired in `AppErrorBoundary` + `main.tsx`).

### ✅ E4. Performance Budget in CI
- `scripts/check-performance-budget.mjs` + `scripts/performance-baseline.json` (15% regression gate).
- Tracks total JS (raw + gzip) after `build:renderer` and median main-thread simulate on 200-component stress circuit.
- CI job `performance-budget`; refresh with `npm run perf:baseline`.

### ✅ E5. PWA / Web Install Parity
Electron is primary; web build stays installable and usable offline.
- `public/sw-shell.js` + `manifest.webmanifest` — offline app shell (`registerWebServiceWorker` in `main.tsx`).
- Status bar warns when simulation runs on main thread (`simulationClient` runtime mode).
- `WebInstallBanner` — install prompt + tablet fullscreen (`usePwaInstall`, safe-area CSS).

---

## F. Education & Onboarding

### ✅ F1. Contextual Hints from Validation
- Click validation issue → `focusValidationIssue` zooms to component/wire (`validationFocus.ts`).
- `ValidationHintsOverlay` on canvas: markers in learning mode, focus ring + hint callout.
- `learningHints.ts` — per-issue-code “how to fix” copy in panel and on canvas.

### ✅ F2. Expanded Tutorial & Challenge Catalog
One DOL tutorial and four challenges ship today.
- Add: star-delta starter, lighting circuit fault, ATS sequence, cable sizing exercise.
- Difficulty tags; estimated time; prerequisites.

### ✅ F3. Classroom / Assignment Mode
- Export a challenge as a locked assignment file (no solution hints).
- Import submissions; auto-grade and produce a score report CSV.

### ✅ F4. Glossary & Symbol Legend Panel
- Dockable glossary: MCB vs MCCB vs MPCB, IEC vs ANSI symbol notes.
- Auto-generate a symbol legend sheet for the current drawing.

---

## G. Internationalization & Accessibility (round 3)

### ❌ G1. i18n Framework
- Extract UI strings; `react-i18n` or similar.
- Ship `en` + one pilot locale (e.g. `de` or `es`) to prove the pipeline.

### ❌ G2. RTL & Locale-Aware Numbers
- Decimal separator and unit labels (mm², °C) per locale.
- PDF/CSV exports respect locale formatting.

### ❌ G3. Screen Reader Flow for Simulation Results
ARIA on canvas is improved; extend to dynamic results.
- Announce simulate completion, fault count, and selected device state changes.
- Live region for Validation issue count.

---

## Suggested Priority (next 6)

1. **B2 Native Electron menu sync** — matches user expectation on desktop; reuses `AppMenuBar` actions.
2. **C1 Documentation pack export** — bundles existing CSV/PDF exports into one deliverable.
3. **B5 Cross-sheet navigation** — high value now that multi-sheet projects are default.
4. **F1 Contextual hints from validation** — cheap UX win; reuses validation + learning infra.
5. **E1 Electron UI smoke tests** — protect the menu/toolbar/canvas refactor from regressions.
6. **A5 Coordination study report** — extends TCC/coordination into a shareable engineering artifact.

---

## Notes for implementers

- Prefer extending existing modules (`drawingExport.ts`, `validation`, `guidedTutorials.ts`,
  `quizChallenges.ts`) over parallel implementations.
- Keep menu definitions DRY if **B2** and **B3** land: one menu config object, multiple surfaces.
- Round 3 items should not reopen Round 2 scope unless a shipped feature needs a deliberate v2.
