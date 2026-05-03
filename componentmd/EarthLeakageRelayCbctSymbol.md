EarthLeakageRelayCbctSymbol
===========================

Summary
-------
EarthLeakageRelayCbctSymbol renders an earth-leakage relay with CBCT (core balance current transformer) notation. It shows trip threshold (mA), phase count and trip delay, and an energized indicator.

Location
--------
src/components/Components/EarthLeakageRelayCbctSymbol.tsx

Props
-----
- component: CircuitComponent — reads properties.earthLeakageTripMa, poles, elrTripDelayMs.
- nodeResult?: NodeResult
- onToggle: () => void — double-click toggles
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Renders 1P or 3P layouts with terminal lines and shows 'ELR XXmA' and phase tag. Energized indicator is a small green circle.

Potential Issues / Things To Verify
----------------------------------
- Doc only in this pass; confirm in the running app after nearby code changes.

Testing Notes
-------------
- Verify ELR trip threshold and delay display, and that the energized LED reflects nodeResult.
