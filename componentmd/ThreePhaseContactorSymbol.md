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
- If a connection point label contains A1/A2/COIL_A/COIL_B it will render the coil terminal tag near that connection point.

Potential Issues / Things To Verify
----------------------------------
- The coilTerminalTag helper maps connection point labels to A1/A2. If your connection point names differ, tags will not render — verify naming conventions in the circuit model.
- No code changes were made.

Testing Notes
-------------
- Verify coil terminal tags appear when connection point labels are set to A1/A2 or COIL_A/COIL_B.
- Toggle the contactor state to see the `isOn` visual change and check connection point alignment.

Implementation Notes / Required Modifications
-------------------------------------------
- The coil terminal detection uses a small whitelist of label forms ('A1', 'A2', 'COIL_A', 'COIL_B'). If your design tools or import pipeline produce alternate spellings (eg. 'A-1', 'A_01', 'COIL1') these tags won't appear. Consider normalising labels earlier in the pipeline or extending the helper to accept more patterns.
