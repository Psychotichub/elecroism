MultimeterSymbol
================

Summary
-------
MultimeterSymbol renders a portable multimeter UI on the canvas. It displays measured voltage/current/continuity text derived from nodeResult and supports cycling modes via an onCycleMode handler.

Location
--------
src/components/Components/MultimeterSymbol.tsx

Props
-----
- component: CircuitComponent — reads `properties.multimeterMode`, `properties.multimeterSignal`, and other multimeter configuration.
- nodeResult?: NodeResult — expected to include meterSignal, voltageV, currentA, powerW.
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- onCycleMode: () => void — called when the MODE button is clicked.
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Supports display modes: voltage, current, continuity. Continuity displays 'BEEP' or 'OPEN' and shows a small lamp when continuity is true.
- High-voltage detection is performed when multimeterHighVoltage is enabled and labels HV or OVER accordingly.
- Connection point labels are used to style terminal colors (COM vs live).

Potential Issues / Things To Verify
----------------------------------
- The component expects nodeResult possibly enriched with meterSignal ('ac'|'dc'). Ensure the simulation layer provides that value for accurate AC/DC display.
- No code changes were made.

Testing Notes
-------------
- Test mode cycling via the MODE button and confirm continuity detection threshold (powerW > 0.5) aligns with expectations.

Implementation Notes / Required Modifications
-------------------------------------------
- This component relies on `nodeResult` fields: `voltageV`, `currentA`, and (optionally) `meterSignal`. If your simulator does not populate `meterSignal` the 'auto' signal detection falls back to 'ac', which may be misleading. Either ensure the simulator populates `meterSignal` or add a mapping layer to the component to derive AC/DC from available measurements.
- Continuity uses `powerW > 0.5` as a heuristic. If you want resistance-based continuity detection or a different threshold, make the threshold configurable.
