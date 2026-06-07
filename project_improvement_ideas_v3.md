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

### ❌ A5. Coordination Study Report (PDF)
TCC plotter and coordination table exist; package them for handoff.
- One-click PDF: TCC curves, device settings table, fault levels, margin notes.
- Include project title block and sheet index when multi-sheet.

---

## B. Editor & UX

### ✅ B1. Desktop Menu Bar (File / Edit / View / Window)
Moved crowded toolbar actions into a standard top menu bar.
- **File**, **Edit**, **Insert**, **View**, **Simulate**, **Window** with nested submenus. ✅ `AppMenuBar.tsx`
- Slim toolbar keeps drawing tools and simulate. ✅ `Toolbar.tsx`

### ⚠️ B2. Native Electron Menu Sync
In-app menu bar works in the renderer; Electron still has no `Menu.setApplicationMenu`.
- Mirror File/Edit/View shortcuts in the OS menu (macOS menu bar, Windows alt-key).
- Wire “About”, “Check for updates”, and platform-standard Quit/Close.
- Single source of truth: shared menu definition consumed by renderer + main process.

### ❌ B3. Customizable Shortcuts & Toolbar
Power users want their own bindings.
- Shortcut editor panel (search, rebind, reset defaults).
- Optional toolbar slots: user picks 6–8 favorite actions.
- Persist to `localStorage` / project preferences.

### ❌ B4. Drawing Layers
Separate power, control, and instrumentation artwork on togglable layers.
- Per-layer visibility, lock, and optional color wash.
- Export/PDF can include or exclude layers.
- “Select on active layer only” mode.

### ❌ B5. Cross-Sheet Navigation
Multi-sheet projects exist; make references actionable.
- Click a sheet reference (`=Sheet2!`) → jump to target sheet and frame the region.
- “References to this sheet” backlinks in the inspector.
- Broken reference validation in the Validation panel.

### ❌ B6. Snapshot Diff / Revision Compare
Local snapshots exist; add a visual diff.
- Side-by-side or overlay: added/removed/moved components, wire changes.
- Label a snapshot as “Rev B” and export a change summary for reviewers.

### ❌ B7. Drag-and-Drop Project Open
- Drop `.eproj` / `.json` onto the window to open (Electron + browser where supported).
- Recent files list in **File → Open Recent**.

---

## C. Deliverables & Reporting

### ❌ C1. Documentation Pack Export
One action → zip folder for the client.
- PDF drawing(s), wire schedule, BOM, terminal schedule, cable schedule, coordination report.
- Manifest `README.txt` listing contents and export timestamp.

### ❌ C2. Panel / MCC Schedule
Auto-generate a lineup table from placed devices.
- Column: tag, type, rating, cable ref, notes.
- CSV + printable PDF table with project header.

### ❌ C3. Simplified Single-Line Diagram (SLD) View
- Optional “SLD mode”: collapse symbols to single-line blocks, hide wire vertices.
- Export SLD-only PDF page for executive / permit submissions.
- Toggle without destroying the detailed schematic.

### ❌ C4. Title Block & Revision Block Editor
Title block fields exist in export; make them editable in-app.
- Project settings dialog: client, drawing number, rev, scale, approval signatures.
- Apply across all sheets; rev history table on the title block.

---

## D. Collaboration & Ecosystem

### ❌ D1. Canvas Annotations & Review Comments
- Pin comments to components or coordinates; resolve / reopen thread.
- Export comments as a review sheet (PDF appendix).
- Optional: export comments JSON for external review tools.

### ❌ D2. Component Library Cloud / Pack Registry
`.elib.json` import/export works locally; add discovery.
- Curated starter packs (IEC symbols, motor starters, BMS I/O) hosted on GitHub Releases.
- In-app “Get packs…” browser with version and compatibility check.

### ❌ D3. Plugin / Extension API (v1)
- Register custom component types + property editors + simulation behavior via a documented hook.
- Sandboxed: no arbitrary Node in renderer; JSON-defined behavior or WASM later.
- Example plugin repo as a template.

### ❌ D4. Organization Templates
- Branded project templates: logo, default title block, standard sheets, device library.
- “New from template” in **File** menu.

---

## E. Quality, Testing & Operations

### ❌ E1. Electron UI Smoke Tests
Unit tests are strong; add a thin E2E layer.
- Playwright or Spectron-style: launch app, load example, run simulate, export PNG.
- Run on CI for Windows; optional macOS job on release tags.

### ❌ E2. Menu & Panel Interaction Tests
- RTL tests for `AppMenuBar` (open File → New fires `clearCircuit`).
- Regression test that keyboard shortcuts still work after menu moves.

### ❌ E3. Opt-In Crash / Error Reporting
- Sentry (or similar) behind a privacy toggle in settings.
- Scrub project names and file paths before upload.
- Offline queue when no network.

### ❌ E4. Performance Budget in CI
- Track bundle size and main-thread simulate time on a fixed stress circuit.
- Fail CI if regression exceeds threshold (e.g. +15% vs baseline).

### ❌ E5. PWA / Web Install Parity
Electron is primary; ensure the web build stays viable.
- Service worker for offline shell; warn when simulate worker unavailable.
- “Install app” prompt and fullscreen on tablets.

---

## F. Education & Onboarding

### ❌ F1. Contextual Hints from Validation
Validation panel lists issues; surface them on the canvas.
- Click an issue → zoom to offending component / wire.
- Learning mode: short “how to fix” hint per issue code.

### ❌ F2. Expanded Tutorial & Challenge Catalog
One DOL tutorial and four challenges ship today.
- Add: star-delta starter, lighting circuit fault, ATS sequence, cable sizing exercise.
- Difficulty tags; estimated time; prerequisites.

### ❌ F3. Classroom / Assignment Mode
- Export a challenge as a locked assignment file (no solution hints).
- Import submissions; auto-grade and produce a score report CSV.

### ❌ F4. Glossary & Symbol Legend Panel
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
