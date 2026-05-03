JunctionSymbol
==============

Summary
-------
JunctionSymbol renders a small filled circle representing a junction/connector between wires. It shows a darker fill when energized.

Location
--------
src/components/Components/JunctionSymbol.tsx

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
- Renders a small filled circle; optionally draws a selection outline and shows connection point markers.

Potential Issues / Things To Verify
----------------------------------
- No code changes were made.

Testing Notes
-------------
- Confirm junction fill changes with node energization and that connection point markers are correctly placed.
