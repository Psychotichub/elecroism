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
- **`meterSignal`:** The simulation engine sets `nodeResult.meterSignal` on the multimeter read path when it resolves a signal type (see `src/simulation/engine.ts`). On Auto, missing `meterSignal` falls back to treating the source as AC — note that when testing edge topologies.

Testing Notes
-------------
- Test mode cycling via the MODE button; continuity uses **`circuit.continuityPowerThresholdW`** (default 0.5 W, set in **Circuit validation**).

Implementation Notes / Required Modifications
-------------------------------------------
- Relies on `nodeResult.voltageV`, `currentA`, and optionally `meterSignal` (engine populates when available). Continuity compares `powerW` to **`circuit.continuityPowerThresholdW`** (same field as **ContinuityBuzzer**; default 0.5 W).
