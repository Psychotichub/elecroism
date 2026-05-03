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
- If the component.type is 'optocoupler_module' the UI uses the opto styling and labels; otherwise it's a generic signal isolator.
- The `terminalTag` helper shortens and maps common substrings (ANALOG→AI, FIELD→FO, RETURN→RTN, POS→+, NEG→-) and truncates to 8 characters.
- Connection points are rendered as small pins with labels placed outside the body, and optionally as blue connection point markers.

Potential Issues / Things To Verify
----------------------------------
- terminalTag performs several sequential .replace calls; if your connection point naming convention differs the labels may not match expected tags. Verify connection point labels in the component model.
- No code changes were made.

Testing Notes
-------------
- Verify pin placement for various connection point positions (top/bottom/left/right) and confirm the derived textual tag on each pin.
