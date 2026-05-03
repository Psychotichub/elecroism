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
- Renders a compact relay body, a small indicator LED for coil energization and labels coil terminals A1/A2 when cp labels match the shared `coilTerminalTag()` rules.

Potential Issues / Things To Verify
----------------------------------
- **Labels:** Same matching as contactors — see `src/utils/coilTerminalTag.ts`. Extend there if new import spellings are required.

Testing Notes
-------------
- Ensure coil tags appear for `A1`/`A2` and common variants (`A-1`, `COIL_A`, …) and that the energised indicator follows `nodeResult` or state.

Implementation Notes / Required Modifications
-------------------------------------------
- Uses `coilTerminalTag` from `src/utils/coilTerminalTag.ts` (shared with `ThreePhaseContactorSymbol` and `ControlSymbol`).
