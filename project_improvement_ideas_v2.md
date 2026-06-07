# ElectroSim — Improvement Ideas (Round 2)

Date: 2026-06-07

This is a fresh backlog that builds on the first round (`project_improvement_ideas.md`).
The quick wins, testing, history patches, CI, macros, learning mode, TCC plotter, and
cable wizard are already done. This list focuses on **depth**: making the simulation
more physically accurate, the editor faster to use, and the app more robust as a product.

Legend: ❌ not started · ⚠️ partial · ✅ done

---

## A. Simulation Accuracy & Engineering Depth

### ✅ A1. Transient / Oscilloscope Timeline (carried over, high value)
Steady-state only today. Add a time axis so users can *see* dynamics.
- Motor starting inrush (≈6× FLC decaying over a few seconds). ✅ overlay in scope
- Breaker clearing time during a fault (ms-resolution). ✅ Fault clearing scenario · 1 ms steps
- Voltage dip during a large motor start. ✅ `applyVoltageDipOverlay` (I × Z on feeder + source)
- UI: a dockable scope panel with selectable channels (V, I per node), play/pause, time cursor. ✅ Scope tab + scenario selector
- Implementation: sample `engine.simulate()` on a fixed virtual clock and buffer a ring of frames. ✅ `transientTimeline.ts`

### ✅ A2. Arc-Flash Incident Energy (finish idea #9 from round 1)
Breaking-capacity checks exist; add the safety layer engineers actually need.
- Compute incident energy (cal/cm²) from prospective fault current + clearing time (IEEE 1584 simplified). ✅ Lee estimate in `arcFlashAnalysis.ts`
- Derive arc-flash boundary and a suggested PPE category. ✅
- Show a per-device badge and a printable label. ✅ Canvas badges + Validation table + .txt download

### ✅ A3. Real Impedance-Based Load Flow
Today propagation is largely topological. Move toward true nodal analysis.
- Per-cable R + X from length and cross-section (already have cross-section). ✅ `cableImpedance.ts`
- Solve node voltages with actual voltage drop instead of estimates. ✅ nodal admittance in `loadFlow.ts`
- Feeds A2 (fault levels) and the cable wizard with real numbers. ✅ `faultLevelAnalysis.ts` + Validation Isc table + sim result fields

### ✅ A4. Earth-Fault Loop Impedance (Zs) & Disconnection Time
- Compute Zs for each final circuit and check against max Zs for the protective device. ✅ `earthFaultLoopValidation.ts`
- Flag circuits that won't disconnect within 0.4 s / 5 s (per device curve). ✅ Validation tab Zs table + issues

### ✅ A5. Harmonics / Power Quality Hooks
There's a `power_quality_analyzer` component but little behind it.
- Let nonlinear loads (VFDs, SMPS) inject a configurable THD. ✅ `thdPercent` + VFD drive on motors/SMPS
- Show estimated neutral current rise from triplen harmonics on 3φ + N. ✅ `powerQuality.ts` + Validation table + PQA readings

---

## B. Editor & Workflow

### ✅ B1. Multi-Select Alignment & Distribution
- Align left/right/top/bottom/center, distribute evenly, snap-to-spacing. ✅ Align toolbar + `componentAlignment.ts`
- Keyboard nudge (arrow keys = 1 grid, Shift+arrow = 10). ✅ Select tool + arrow keys

### ✅ B2. Auto-Wire Bus Drop
- Drag from a busbar tap and have new feeders auto-route + auto-number. ✅ Wire tool + bus tap → canvas click (`busDrop.ts`)
- "Add identical feeder" duplicates a breaker→load branch with incremented labels. ✅ Properties panel button + auto tap pick

### ✅ B3. Smart Renumbering & Designator Rules
- Configurable designator scheme (e.g. `=location+function-number`, IEC 81346). ✅ Validation tab + `designatorRules.ts`
- Bulk renumber by column/row order; detect duplicate device tags. ✅ Row/column renumber + validation errors

### ✅ B4. Find / Command Palette Upgrades
- Jump-to-component by label, fuzzy search across the whole drawing. ✅ Ctrl+K palette + `find`/`goto` commands
- "Select all of type", "select unwired terminals", "select faulted". ✅ Quick actions + `selectall` / `select unwired` / `select faulted`

### ✅ B5. Connection Integrity Overlay
- Toggle that highlights every **unconnected terminal** and **floating wire end** in red.
- Counts in the status bar: terminals, wires, open ends, junctions.

### ✅ B6. Better Wire Routing
Manual ortho works; add quality-of-life:
- Auto-avoid crossing component bodies (obstacle-aware A* already partly exists in `wireAutoRoute`). ✅ A* fallback + wire auto-reroute
- Bundle parallel wires with even spacing; nudge a whole bundle together. ✅ Space bundle + bundle segment drag (`wireBundle.ts`)

---

## C. Documentation & Output (Deliverables engineers need)

### ✅ C1. PDF / Multi-Sheet Drawing Export
- Title block (project, drawing no., rev, date, drawn-by). ✅ Validation tab + `drawingExport.ts`
- Multi-page export with sheet references and a sheet index. ✅ Per-sheet crops + index page when 2+ sheets

### ✅ C2. Bill of Materials (BOM) Export
- Group identical devices, count, ratings, manufacturer/part fields.
- CSV + printable table. (Wire schedule CSV already exists — extend the pattern.)

### ✅ C3. Terminal / Connection Schedule
- Auto-generate a terminal block wiring table (from/to, wire number, color, mm²).
- Complements the existing wire schedule.

### ✅ C4. Cable Schedule with the Wizard Results
- Persist the cable-sizing wizard output per wire and export it as a schedule. ✅ `Wire.cableSizing` + `cableScheduleExport.ts`

---

## D. Product, Persistence & Collaboration

### ✅ D1. Project Files with Multiple Sheets
- One project → many circuit sheets + shared device library. ✅ `.eproj` + sheet tabs + project `library`
- Recent-projects list and autosave/restore on crash. ✅ localStorage autosave + restore dialog + recent on save

### ✅ D2. Versioned Autosave & Local Snapshots
- Periodic local snapshots (IndexedDB) separate from undo history. ✅ `projectSnapshots.ts` (5 min auto + manual)
- "Restore previous session" on startup. ✅ Enhanced restore dialog (autosave + snapshot picker)

### ✅ D3. Component Library Manager
- User-defined components/macros with custom terminals and properties. ✅ Validation tab editor (labels, terminals, ratings)
- Import/export library packs (JSON), share between machines. ✅ `.elib.json` packs (`componentLibraryPack.ts`)

### ✅ D4. Templated Starters
- One-click insert of full patterns: DOL, star-delta, VFD feeder, ATS. ✅ Toolbar **Starters** dropdown (`insertCircuitTemplate`, `circuitTemplates.ts`)
- These could ship as macros + example circuits. ✅ Same builders in `exampleCircuits.ts` (Examples menu + template catalog)

---

## E. Quality, Performance & Robustness

### ✅ E1. Tighten Type-Aware Lint Debt
Round 1 enabled type-checked ESLint but disabled the `no-unsafe-*` family and left
45 `no-unnecessary-type-assertion` warnings. Burn these down file-by-file and
re-enable the unsafe rules once clean. ✅ `CircuitStore` extracted to `circuitStoreTypes.ts`; slices typed via `sliceTypes.ts`; all `no-unsafe-*` + `no-unnecessary-type-assertion` enforced as errors (`--max-warnings 0`).

### ✅ E2. Canvas Performance at Scale
- Virtualize/cull off-screen components and wires (Konva layer caching). ✅ `viewportCull.ts` + split schematic/interaction layers; cache on pan (≥80 components)
- Benchmark with 500+ components; target stable 60 fps pan/zoom. ✅ `canvasStressCircuit.ts` + `viewportCull.test.ts` (60 cull frames &lt;100ms)

### ✅ E3. Simulation Performance
- Memoize the terminal graph; only rebuild affected subgraphs on edit. ✅ `TerminalGraphCache` (wire skeleton + pickup-iteration cache + incremental bridge patch)
- Web Worker for `engine.simulate()` so large circuits don't block the UI. ✅ `simulationWorker.ts`

### ✅ E4. Expand the Test Suite
- Snapshot tests for each example's simulation result (lock in correct energization). ✅ `exampleSimulationSnapshots.test.ts` + `simulationSnapshot.ts`
- Property tests for wire numbering through chained junctions/connection points. ✅ extended `wireEndpointNumbering.test.ts` (chain + branch + depth property cases)
- Coverage target and a CI gate. ✅ `test:coverage` with v8 thresholds; CI runs `npm run test:coverage`

### ✅ E5. Electron Security & Packaging
- Fix the dev-time CSP warning (set a Content-Security-Policy). ✅ `electron/security.cjs` + Vite production CSP meta; dev uses `ELECTRON_DISABLE_SECURITY_WARNINGS` (Vite HMR needs `unsafe-eval`)
- Auto-update channel; signed installers; macOS/Linux targets alongside Windows. ✅ `electron-updater` + GitHub publish (`Psychotichub/elecroism`); `build:desktop:{win,mac,linux,publish}`; release signing via `CSC_LINK` (+ `APPLE_ID` / notarize on macOS) in CI

### ✅ E6. Accessibility & Theming
- Full keyboard navigation of the palette and panels; ARIA on canvas controls. ✅ palette listbox (↑↓/Home/End/Enter), inspector tablist arrows, toolbar `aria-pressed`, canvas `role="application"` + view toolbar
- High-contrast theme; persist theme and panel layout. ✅ `high-contrast` in `themeStore` (persisted); panel collapse + inspector tab in `uiStore` / localStorage

---

## F. Education & Guidance (extends Learning Mode)

### ✅ F1. Guided Tutorials
- Step-by-step interactive lessons ("Build a DOL starter") with checkpoints. ✅ `guidedTutorials.ts` + `TutorialPanel` + toolbar Tutorials menu; live checkpoint validation on circuit/simulation state

### ✅ F2. Inline "Why is this off?" Tracing
- Click a dead load → engine explains the first broken link in the path
  (e.g. "KM1 coil not energized → main contacts open").

### ✅ F3. Quiz / Challenge Mode
- Present a fault and ask the user to diagnose it; auto-grade against the engine. ✅ `quizChallenges.ts` + `ChallengePanel`; toolbar Challenges menu; grading via `explainWhyDeenergized` + keyword overlap (hints hidden until submit)

---

## Suggested Priority (next 6)

1. **A1 Transient/oscilloscope view** — biggest "wow" + teaching value.
2. **B5 Connection integrity overlay** — cheap, prevents the #1 user mistake (unwired terminals).
3. **C2 BOM export** + **C3 terminal schedule** — real deliverables, reuse wire-schedule code.
4. **F2 "Why is this off?" tracing** — leverages the existing engine + learning mode.
5. **E3 Simulation in a Web Worker** — keeps the app smooth as circuits grow.
6. **A3 Impedance-based load flow** — foundation for A2/A4 and accurate cable sizing.
