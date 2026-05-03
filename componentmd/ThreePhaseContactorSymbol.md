ThreePhaseContactorSymbol
=========================

Summary
-------
ThreePhaseContactorSymbol renders a contactor (3P or 4P) including pole terminals, coil terminals, and auxiliary contacts (NO/NC). The symbol displays coil terminal tags (A1/A2) when connection point labels match expected names.

Location
--------
src/components/Components/ThreePhaseContactorSymbol.tsx

Props
-----
- component: CircuitComponent — used for type, state and connectionPoints.
- nodeResult?: NodeResult — used to display energized visual styles.
- onSelect: () => void — click handler.
- onDragEnd: (x: number, y: number) => void — drag end handler.
- showConnectionPoints: boolean — whether to show connection point markers.
- selected: boolean — whether to show selection outline.

Behavior
--------
- Supports 3P and 4P layouts, adapts coil positions and pole colors accordingly.
- Renders coil wiring to the left/right of the main body and shows NO/NC auxiliary contact labels with small contact graphics.
- Coil tags use shared `coilTerminalTag()` from `src/utils/coilTerminalTag.ts` (see below).

Potential Issues / Things To Verify
----------------------------------
- **Label coverage:** Tags appear for `A1`/`A2`, `COIL_A`/`COIL_B`, dashed/underscored variants (`A-1`, `COIL1`, …). If your model uses other coil names, extend `coilTerminalTag` in one place.

Testing Notes
-------------
- Verify coil terminal tags for A1/A2, COIL_A/COIL_B, and a sample import-style label (e.g. `A-1`).
- Toggle the contactor state to see the `isOn` visual change and check connection point alignment.

Implementation Notes / Required Modifications
-------------------------------------------
- Shared helper: `import { coilTerminalTag } from '../../utils/coilTerminalTag'` (also used by `ControlSymbol`, `InterposingRelaySymbol`).
