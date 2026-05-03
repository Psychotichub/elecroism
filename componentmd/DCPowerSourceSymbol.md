DCPowerSourceSymbol
====================

Summary
-------
DCPowerSourceSymbol renders a circular DC source symbol with plus/minus stub labelling and a voltage label. It supports multiple connection points and highlights when energized.

Location
--------
src/components/Components/DCPowerSourceSymbol.tsx

Props
-----
- component: CircuitComponent — reads properties.voltage (default 24 V) and connectionPoints.
- nodeResult?: NodeResult
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Each connection point is drawn with a stub from the circle perimeter to the cp and labelled '+' or '−' depending on if its label contains 'MINUS'.

Potential Issues / Things To Verify
----------------------------------
- stubFromCenter uses the cp coordinates relative to the component. Ensure connectionPoints are in the same coordinate space.
- Doc only in this pass; confirm in the running app after nearby code changes.

Testing Notes
-------------
- Confirm label rendering for plus/minus terminals and that the DC voltage text reflects component.properties.voltage.
