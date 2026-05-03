ThreePhaseSourceSymbol
======================

Summary
-------
ThreePhaseSourceSymbol renders a three-phase voltage source symbol (3φ) on the Konva canvas. It displays nominal line-to-line voltage and visually indicates energized state.

Location
--------
src/components/Components/ThreePhaseSourceSymbol.tsx

Props
-----
- component: CircuitComponent — model for the source; reads `properties.lineVoltage` or `properties.voltage` with a 400 V fallback.
- nodeResult?: NodeResult — used to determine energized visuals.
- onSelect: () => void — click handler.
- onDragEnd: (x: number, y: number) => void — drag end handler.
- showConnectionPoints: boolean — whether to render connection point circles.
- selected: boolean — whether to show a selection outline.

Behavior
--------
- Renders a circular source body with arcs and terminal lines for three phases and neutral/earth.
- Shows `vLL` (line-line voltage) text and `3φ` label.
- When energized, the body color and shadow change to indicate active state.

Potential Issues / Things To Verify
----------------------------------
- Voltage fallback is 400 V when properties are absent; adjust if you need a different default.
- No code changes were made; this file documents behavior and verifications.

Testing Notes
-------------
- Verify the displayed voltage updates when component properties change.
- Toggle energised state in the simulation to observe visual changes.
