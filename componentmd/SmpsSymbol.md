SmpsSymbol
==========

Summary
-------
SmpsSymbol draws a switch-mode power supply brick-style symbol. It renders AC input and DC output connection callouts, voltage label, screws and decorative styling. It adapts visuals when energized.

Location
--------
src/components/Components/SmpsSymbol.tsx

Props
-----
- component: CircuitComponent — expects connection point labels like 'AC_L', 'AC_N', 'V+','V-'.
- nodeResult?: NodeResult
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Uses component.properties.voltage (default 24 V) to render output voltage text.
- Maps connection point labels to visual tags (L/N/V+/V−) and colour codes terminals.

Potential Issues / Things To Verify
----------------------------------
- The connection point label mapping is case-insensitive and looks for substrings like 'PLUS'/'MINUS' or exact 'AC_L'. If your connection labels differ, the tag mapping may be off.
- Doc only in this pass; confirm in the running app after nearby code changes.

Testing Notes
-------------
- Verify that connection points show proper tags and colours for AC and DC connections and that the displayed voltage reflects component.properties.voltage.
