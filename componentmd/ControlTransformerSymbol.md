ControlTransformerSymbol
========================

Summary
-------
ControlTransformerSymbol renders a small control transformer symbol (XFMR) with primary/secondary stubs and a displayed secondary voltage.

Location
--------
src/components/Components/ControlTransformerSymbol.tsx

Props
-----
- component: CircuitComponent — reads properties.voltage for display.
- nodeResult?: NodeResult
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Draws four small terminal vertical stubs representing primary/secondary connections and a central divider. Shows `XFMR {V}V` text.

Potential Issues / Things To Verify
----------------------------------
- Doc only in this pass; confirm in the running app after nearby code changes.

Testing Notes
-------------
- Verify that the voltage text matches component.properties.voltage and that connection point stubs line up correctly.
