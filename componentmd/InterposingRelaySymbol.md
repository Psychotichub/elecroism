InterposingRelaySymbol
======================

Summary
-------
InterposingRelaySymbol renders a small interface relay (K-IF) with coil A1/A2 terminal tagging. It shows coil voltage and simulated energised indicator.

Location
--------
src/components/Components/InterposingRelaySymbol.tsx

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
- Renders a compact relay body, a small indicator LED for coil energization and labels coil terminals A1/A2 when cp labels match.

Potential Issues / Things To Verify
----------------------------------
- coilTerminalTag only recognizes exact labels 'A1' and 'A2' — if your connection point labels vary, tags won't show.
- No code changes were made.

Testing Notes
-------------
- Ensure coil tags appear when connectionPoints have labels 'A1'/'A2' and that the energised indicator follows nodeResult or state.

Implementation Notes / Required Modifications
-------------------------------------------
- The coilTerminalTag helper is strict (exact match). If your imported/created components use alternate coil labelling, extend the helper to trim/pattern-match common variants (e.g., allow 'A-1', 'A_1', 'COIL1').
