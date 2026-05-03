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
- The component expects nodeResult fields like lineVoltageRmsV and lineCurrentRmsA; ensure the simulator returns them for accurate reading display.
- No code changes were made.

Testing Notes
-------------
- Verify values update in real time from the simulator and that the meter's protocol label reflects component.properties.meterProtocol.

Implementation Notes / Required Modifications
-------------------------------------------
- The energy meter expects `nodeResult.lineVoltageRmsV` and `nodeResult.lineCurrentRmsA`. If your simulation returns different fields (for example `voltageV`/`currentA`), update the simulator or add mapping logic in the component so the meter shows correct values.
