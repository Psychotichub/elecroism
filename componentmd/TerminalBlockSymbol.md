TerminalBlockSymbol
===================

Summary
-------
TerminalBlockSymbol renders a small terminal block box with a split line and optional energized indicator.

Location
--------
src/components/Components/TerminalBlockSymbol.tsx

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
- Draws a square terminal block with a center dashed split, a 'TB' label, and connection points if requested. Shows small green LED when energized.

Potential Issues / Things To Verify
----------------------------------
- Doc only in this pass; confirm in the running app after nearby code changes.
- The ComponentCanvasLabel call in the file contains an inline-wrapped line; it's valid but visually dense. Verify label offsets and sizes in your app.

Testing Notes
-------------
- Confirm connection points align with the model and energized indicator appears when nodeResult.energized is true.
