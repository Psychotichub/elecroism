SignalIsolationSymbol
=====================

Summary
-------
SignalIsolationSymbol renders either an optocoupler module or a generic signal isolator module depending on component.type. It shows left/right stubs for channel connections, terminal tags derived from connection labels, and an energized indicator.

Location
--------
src/components/Components/SignalIsolationSymbol.tsx

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
- If the component.type is `optocoupler_module` the UI uses the opto styling and labels; otherwise it's a generic signal isolator.
- **`signalIsolationTerminalTag`** trims labels, strips `_SIG` / `_CH` suffixes (case-insensitive), converts underscores to spaces, then applies **word-boundary** replacements: ANALOG→AI, FIELD→FO, DRY→DO, RETURN→RTN, NEG→-, POS→+. Collapses whitespace and truncates to **8** characters.
- Connection points are rendered as small pins with labels placed outside the body, and optionally as blue connection point markers.

Potential Issues / Things To Verify
----------------------------------
- Unusual token names may still need new `\b…\b` rules in `signalIsolationTerminalTag`; extend the function in `SignalIsolationSymbol.tsx`.

Testing Notes
-------------
- Verify pin placement for various connection point positions (top/bottom/left/right) and confirm the derived textual tag on each pin (including mixed-case labels).

Implementation Notes / Required Modifications
-------------------------------------------
- Keep tag logic in one function next to the symbol so geometry and abbreviations stay aligned.
