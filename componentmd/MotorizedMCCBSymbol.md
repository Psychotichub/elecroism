MotorizedMCCBSymbol
===================

Summary
-------
MotorizedMCCBSymbol renders a motorized MCCB (motor circuit breaker) with BMS (remote motor starter) metadata support. It shows pole handles, BMS status, control wiring stubs and labels for control terminals.

Location
--------
src/components/Components/MotorizedMCCBSymbol.tsx

Props
-----
- component: CircuitComponent — reads properties such as mccbBmsEnabled, mccbBmsProtocol, relay IDs, fuse designation, ratingAmps, tripCurve.
- nodeResult?: NodeResult
- onToggle: () => void — toggles on double-click when not tripped
- onReset: () => void — resets tripped breaker on double-click when tripped
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Displays 3P or 4P layout depending on component.type.
- When BMS is enabled, renders BMS status text and fuse/motor/op IDs.
- Control terminals (labels starting MOT_, ST_, AUX_, TRIP_) are rendered with stubs and right-aligned labels.
- Tripped state flashes an indicator via a setInterval toggling every 500ms.

Potential Issues / Things To Verify
----------------------------------
- The isControlTerminal test uses a regex matching prefixes; confirm your control cp labels use these prefixes.
- setInterval is cleaned up on state changes but ensure rapid tripping/untripping doesn't create unexpected intervals.
- No code changes were made.

Testing Notes
-------------
- Verify double-click operating behavior: onToggle when not tripped, onReset when tripped.
- Confirm control terminal stubs and labels appear and that BMS derived text reflects properties.

Implementation Notes / Required Modifications
-------------------------------------------
- The control-terminal label regex is strict (matches ^(MOT_|ST_|AUX_|TRIP_)). If your labels use alternate prefixes, the control stubs won't render. Consider extending the regex or normalising labels.
- The flashing interval cleanup is implemented correctly; if you observe duplicate intervals in dev with React Strict Mode, confirm cleanup is effective. Storing the interval id in a ref is a trivial hardening.
