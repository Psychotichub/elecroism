# ElectroSim Project Improvement Ideas

Date: 2026-05-03

## Current Impression

ElectroSim has grown into a highly advanced tool. Features like the BMS Simulator, Protection Coordination, Circuit Validation Panel, and Unbalanced 3-phase load support are now successfully implemented!

To take ElectroSim to the next level—transitioning from a great schematic editor to an indispensable engineering and educational platform—the focus should shift to automated testing, performance at scale, and advanced analytical tools.

## High-Impact Quick Wins

### 1. Replace the Default README

The current `README.md` is still the default React + Vite template. This makes the project look unfinished even though the app itself is incredibly advanced.

Recommended README sections:
- What ElectroSim does
- Main features (highlight BMS simulator, Validation, and Coordination)
- Supported components
- How to run in development
- How to build the desktop app
- Screenshots

### 2. Add Test Coverage for the Simulation Engine

The simulation engine is the most important and risky part of the project. It should have automated tests for common circuits.

Recommended tests:
- Single-phase source -> MCB -> load
- Three-phase short circuit between L1/L2/L3
- BMS ACB close blocked by UVR
- Motorized MCCB close blocked by missing control voltage

### 3. Add Example Circuit Files

Create saved demo circuits that users can load immediately.
- Three-phase motor starter
- ACB incomer with BMS control
- BMS IO panel with Modbus/BACnet gateways

## Engineering Improvements

### 4. Split Large Files into Smaller Modules

Some files have grown very large:
- `src/components/Panels/PropertyPanel.tsx` (huge)
- `src/simulation/engine.ts` (96KB+)
- `src/store/circuitStore.ts` (70KB+)

Suggested refactor:
- Move component property editors into separate files.
- Split simulation into focused modules (fault detection, load calculation, etc.).
- Split store actions by feature using Zustand slices.

### 5. Optimize History Store for Performance

The current `circuitStore.ts` tracks history in an array. As circuits get larger, deep copying the state can become a memory bottleneck.

Recommended improvements:
- Implement patches (e.g., using `immer`) instead of full state clones for history.
- Limit the history size to prevent memory leaks during long sessions.

### 6. Add Type-Aware ESLint Rules & CI Checks

- Enable `typescript-eslint` recommended type-checked rules.
- Add a GitHub Actions workflow (`npm run lint`, `npm run build`, `npm test`) to prevent broken builds.

## Advanced Analytical & Engineering Ideas (NEW)

### 7. Time-Current Curve (TCC) Plotter

While the Protection Coordination table in the Validation panel is excellent, visualizing it is the industry standard.
- Implement a graphical log-log plot showing the trip curves of upstream and downstream protective devices.
- Overlay the calculated short-circuit current and motor starting inrush current on the graph to visually prove coordination.

### 8. Automated Cable Sizing & Voltage Drop Wizard

Instead of just warning about undersized cables, provide an automated wizard.
- User inputs: Load kW, distance (meters), installation method.
- App calculates the required cross-sectional area (mm²) based on ampacity and acceptable voltage drop (e.g., 3%).
- Automatically updates the wire properties in the schematic.

### 9. Short-Circuit & Arc Flash Calculation

Take the simulation beyond steady-state load flow.
- Calculate the prospective short-circuit current (Isc) at various nodes based on source impedance and cable lengths.
- Warn if a component's breaking capacity (kA rating) is lower than the prospective fault current.
- (Bonus) Calculate incident energy for Arc Flash boundaries.

### 10. Transient / Oscilloscope View

The current simulation result is a steady-state snapshot. Adding a timeline would allow simulating transient events.
- Visualize motor starting inrush current over time (e.g., 6x In for 5 seconds).
- Show the exact millisecond clearing time of a breaker during a short circuit.
- Graph voltage dips during heavy load starts.

## User Experience & Product Ideas

### 11. Add Search and Filtering in the Component Sidebar

The component list is large. Add:
- Search box
- Category filters
- Favorites & Recently used components

### 12. Add Component Grouping (Macros)

Allow users to select multiple components (e.g., MCB + Contactor + Overload Relay) and group them into a single reusable "Macro" component. 
- Greatly speeds up building repetitive structures like DOL starters or VFD panels.

### 13. Generate 2D Panel Layouts

Automatically generate a 2D physical layout diagram of the electrical panel based on the schematic components.
- Assign physical dimensions (W x H x D) to components.
- Allow users to drag and drop them onto a virtual DIN rail or mounting plate.

### 14. Add Learning Mode

Learning mode could explain faults and wiring mistakes in simple terms.
- "This load is not energized because neutral is missing."
- "This breaker tripped because current exceeded the C-curve threshold."

## Recommended Priority Order

1. **Replace `README.md`** (Crucial for presentation).
2. **Add Vitest** and simulation tests (Crucial for stability before refactoring).
3. **Optimize History Store** (Crucial for performance).
4. **Split Large Files** (`engine.ts`, `circuitStore.ts`, `PropertyPanel.tsx`).
5. **Component Sidebar Search** (UX win).
6. **Example Circuits & Component Grouping** (Product win).
7. **Time-Current Curve Plotter** (Massive engineering value).
8. **Cable Sizing Wizard**.
