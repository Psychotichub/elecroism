EnergyMeterSymbol
=================

Summary
-------
EnergyMeterSymbol renders a multifunction energy meter (digital display style) and shows measured U (line-line), I (line current), and P (power) when nodeResult is present. It also shows protocol and a short meter tag.

Location
--------
src/components/Components/EnergyMeterSymbol.tsx

Props
-----
- component: CircuitComponent — reads properties like lineVoltage and meterProtocol.
- nodeResult?: NodeResult — expected to include lineVoltageRmsV, lineCurrentRmsA, powerW.
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Formats power using fmtKw and renders U/I/P values if energized, otherwise shows placeholders.
- Connection points for IN/OUT L1/L2/L3/N are drawn with colour-coded stub lines and tags.

Potential Issues / Things To Verify
----------------------------------
- **`lineVoltageRmsV` / `lineCurrentRmsA`:** Filled by the engine when the meter’s node is evaluated with branch data (`src/simulation/engine.ts`). The symbol also falls back to `currentA` / `component.properties.lineVoltage` where coded — verify your circuit still shows sensible numbers.

Testing Notes
-------------
- Verify values update in real time from the simulator and that the meter's protocol label reflects component.properties.meterProtocol.

Implementation Notes / Required Modifications
-------------------------------------------
- Prefer aligning simulator output with `lineVoltageRmsV` / `lineCurrentRmsA`; partial fallbacks exist in `EnergyMeterSymbol.tsx` for current and rated voltage.
