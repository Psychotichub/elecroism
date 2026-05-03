PhaseIndicatorBankSymbol
========================

Summary
-------
PhaseIndicatorBankSymbol visualizes a three-lamp phase indicator block (L1/L2/L3), showing red/amber/green for phases and an energized highlight.

Location
--------
src/components/Components/PhaseIndicatorBankSymbol.tsx

Props
-----
- component: CircuitComponent
- nodeResult?: NodeResult
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Renders three coloured circles with labels L1/L2/L3. The fill colours change to indicate energized state.

Potential Issues / Things To Verify
----------------------------------
- Doc only in this pass; confirm in the running app after nearby code changes.

Testing Notes
-------------
- Verify connection points are positioned correctly and the energized state toggles the colours as expected.
