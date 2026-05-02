# ElectroSim Project Improvement Ideas

Date: 2026-05-01

## Current Impression

ElectroSim already has a useful foundation: React + TypeScript, Electron desktop packaging, a canvas-based electrical schematic editor, many electrical/BMS components, simulation logic, fault detection, and export utilities.

The biggest opportunities are not only adding more components. The project would become much stronger if it improves reliability, documentation, testing, and guided workflows.

## High-Impact Quick Wins

### 1. Replace the Default README

The current `README.md` is still the default React + Vite template. This makes the project look unfinished even though the app itself is much more advanced.

Recommended README sections:

- What ElectroSim does
- Main features
- Supported components
- How to run in development
- How to build the desktop app
- How simulation works at a high level
- Known limitations
- Screenshots

Why it helps:

- Makes the project look professional.
- Helps future users and contributors understand the app quickly.
- Reduces setup confusion.

### 2. Add Test Coverage for the Simulation Engine

The simulation engine is the most important and risky part of the project. It should have automated tests for common circuits.

Recommended tests:

- Single-phase source -> MCB -> load
- Three-phase source -> 3P MCB -> motor
- Three-phase short circuit between L1/L2/L3
- Line-neutral fault
- ACB trip behavior
- BMS ACB close blocked by UVR
- Motorized MCCB close blocked by missing control voltage
- Motorized MCCB close blocked by motor not ready
- Contactor overload warning

Suggested tools:

- Vitest
- React Testing Library for UI tests later

Why it helps:

- Prevents future changes from breaking single-phase, three-phase, or BMS behavior.
- Makes it easier to refactor the large simulation files safely.

### 3. Add Example Circuit Files

Create saved demo circuits that users can load immediately.

Recommended examples:

- Basic single-phase lighting circuit
- Single-phase socket circuit with MCB
- Three-phase motor starter
- ACB incomer with BMS control
- Motorized MCCB with remote BMS commands
- ELR + CBCT earth leakage example
- SMPS + 24 VDC control circuit
- BMS IO panel with Modbus/BACnet gateways

Why it helps:

- New users learn by exploring working circuits.
- You can reuse these as manual test cases.
- It makes the app feel more complete.

## Engineering Improvements

### 4. Split Large Files into Smaller Modules

Some files are very large:

- `src/components/Panels/PropertyPanel.tsx`
- `src/simulation/engine.ts`
- `src/store/circuitStore.ts`
- `src/components/Canvas/CircuitCanvas.tsx`

Suggested refactor:

- Move component property editors into separate files.
- Split simulation into focused modules:
  - potential propagation
  - load current calculation
  - fault detection
  - BMS interlocks
  - protective device tripping
  - multimeter measurement
- Split store actions by feature:
  - component actions
  - wire actions
  - history actions
  - BMS actions
  - phase-system actions

Why it helps:

- Easier debugging.
- Easier testing.
- Less chance of accidentally breaking unrelated systems.

### 5. Add Type-Aware ESLint Rules

The project already uses TypeScript and ESLint, but stricter type-aware linting would catch more bugs.

Recommended upgrade:

- Enable `typescript-eslint` recommended type-checked rules.
- Add rules for unused variables, unsafe assignment, and missing promise handling.

Why it helps:

- Catches errors before build time.
- Improves code quality as the simulation grows.

### 6. Add CI Checks

Add a GitHub Actions workflow or similar CI pipeline.

Recommended CI steps:

```bash
npm ci
npm run lint
npm run build
npm test
```

Why it helps:

- Every change is automatically verified.
- Prevents broken builds from being merged.
- Makes the project easier to maintain long-term.

### 7. Add Error Boundaries and User-Friendly Runtime Errors

Canvas/simulation apps can fail from malformed circuit data. Add React error boundaries around major UI areas.

Recommended areas:

- Canvas
- Property panel
- Simulation results/fault dialog
- File import/export

Why it helps:

- A bad component or imported file does not crash the whole app.
- Users get a readable message and recovery option.

## Simulation Improvements

### 8. Add a Circuit Validation Panel

Before running simulation, show validation warnings.

Useful warnings:

- Source missing
- Load has no return path
- Three-phase motor missing one phase
- Neutral not connected where required
- PE used as neutral
- Wire size too small for current
- Breaker rating too high for downstream cable
- BMS command configured but no control supply
- Modbus/BACnet component has missing address/IP

Why it helps:

- Users learn what is wrong before simulation.
- Makes the app more educational and practical.

### 9. Add Per-Phase Current and Voltage Results

Current output appears mostly component-level. Three-phase circuits would benefit from per-phase values.

Recommended fields:

- L1 current
- L2 current
- L3 current
- Neutral current
- L1-N voltage
- L2-N voltage
- L3-N voltage
- L1-L2 voltage
- L2-L3 voltage
- L3-L1 voltage

Why it helps:

- Better troubleshooting.
- More realistic three-phase diagnostics.
- Helps detect imbalance.

### 10. Add Unbalanced Three-Phase Load Support

Balanced three-phase math is useful, but real panels often have uneven loads.

Recommended behavior:

- Allow per-phase load assignment.
- Calculate neutral current for 4-wire systems.
- Warn on phase imbalance above a set percentage.

Why it helps:

- More realistic distribution-board simulation.
- Better educational value.

### 11. Improve Protection Coordination

Add a simple coordination view for breakers/fuses.

Useful features:

- Upstream/downstream protective device chain
- Trip threshold comparison
- Warning when downstream device rating is higher than upstream
- Warning when cable size is not protected
- Time-current curve preview later

Why it helps:

- Makes ElectroSim more than a drawing tool.
- Adds real engineering value.

## BMS and Controls Improvements

### 12. Add a BMS Command/Feedback Simulator

Create a small panel for remote BMS operations.

Recommended controls:

- ACB close command
- ACB shunt trip command
- MCCB motor close command
- MCCB shunt open command
- UVR energized toggle
- Control voltage OK toggle
- Motor ready toggle
- Spring charged toggle

Recommended feedback:

- 52a closed feedback
- 52b open feedback
- Trip alarm
- Command accepted/rejected reason

Why it helps:

- Makes BMS behavior visible and testable.
- Helps users understand why a breaker did or did not operate.

### 13. Add Communication Validation

For Modbus/BACnet/BMS devices, validate network settings.

Useful checks:

- Duplicate Modbus slave ID
- Invalid IP/subnet
- Missing BACnet device instance
- Gateway without connected field devices
- Communication wire connected to power terminal

Why it helps:

- Adds real BMS panel-design intelligence.
- Prevents common documentation mistakes.

## User Experience Improvements

### 14. Add Guided Tooltips and Inspector Help

Electrical users may know circuits, but not your app behavior. Add contextual help inside the property panel.

Good places:

- Phase system selector
- Breaker rating
- Trip curve
- ACB BMS fields
- MCCB motor pack fields
- Modbus/BACnet address fields
- Multimeter modes

Why it helps:

- Reduces user confusion.
- Makes the app easier to learn without a manual.

### 15. Add Search and Filtering in the Component Sidebar

The component list is large. Add:

- Search box
- Category filters
- Favorites
- Recently used components

Why it helps:

- Faster schematic creation.
- Better experience as more components are added.

### 16. Improve Import/Export

Recommended export upgrades:

- Export schematic as PNG/SVG/PDF
- Export bill of materials
- Export wire schedule
- Export BMS IO list
- Export fault report
- Export simulation result table

Why it helps:

- Makes the app useful for documentation, not just simulation.

## Product-Level Ideas

### 17. Add Project Templates

Templates could include:

- Small apartment DB
- Pump starter panel
- AHU BMS control panel
- Main LV incomer
- ATS panel
- Motor control center feeder

Why it helps:

- Gives users a fast starting point.
- Shows the intended professional use cases.

### 18. Add Learning Mode

Learning mode could explain faults and wiring mistakes.

Examples:

- "This load is not energized because neutral is missing."
- "This three-phase motor is missing L2."
- "This BMS close command failed because UVR is not energized."
- "This breaker tripped because current exceeded the C-curve threshold."

Why it helps:

- Makes ElectroSim valuable for students, technicians, and junior engineers.

### 19. Add a Changelog

Create `CHANGELOG.md` and record changes by date/version.

Why it helps:

- Tracks progress.
- Makes releases easier.
- Helps users understand what changed.

## Recommended Priority Order

1. Replace `README.md` with real ElectroSim documentation.
2. Add Vitest and write simulation tests for single-phase, three-phase, and BMS cases.
3. Add example circuit templates.
4. Split `engine.ts`, `PropertyPanel.tsx`, and `circuitStore.ts` into smaller modules.
5. Add a circuit validation panel.
6. Add BMS command/feedback simulator UI.
7. Add per-phase diagnostics and imbalance warnings.
8. Add CI checks.
9. Improve exports for BOM, wire schedule, BMS IO list, and fault reports.
10. Add project templates and learning mode.

## Best Next Step

The best immediate next step is to add automated simulation tests. Your project is now complex enough that each new electrical feature can accidentally break another one. Tests for single-phase, three-phase, and BMS circuits will make future development much safer.
