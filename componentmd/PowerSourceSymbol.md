PowerSourceSymbol
=================

Summary
-------
PowerSourceSymbol is a single-phase source symbol rendered as a circular source with stubs to connection points. It derives label positions dynamically from connection point geometry.

Location
--------
src/components/Components/PowerSourceSymbol.tsx

Props
-----
- component: CircuitComponent — expects connectionPoints (x,y,label) around the symbol.
- nodeResult?: NodeResult
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Computes stub start points on the body circumference toward each connection point and draws a short line to the cp.
- Colors the stub stroke based on the connection point label (N vs L).
- Displays the voltage using component.properties.voltage or defaults to 230 V.

Potential Issues / Things To Verify
----------------------------------
- stubFromCenter computes a unit vector from the center to the cp. If a cp is at the origin the function returns a fallback stub downward. Ensure connectionPoints are sensible.
- No code changes were made.

Testing Notes
-------------
- Test with multiple connection point placements to ensure the maxReach computed for selection outlines is correct.
