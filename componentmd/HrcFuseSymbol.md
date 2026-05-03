HrcFuseSymbol
=============

Summary
-------
HrcFuseSymbol renders HRC or control-circuit fuse blocks with 1, 2 or 3 poles. It shows rating, HRC class and breaking capacity where available and indicates tripped state with a flashing marker.

Location
--------
src/components/Components/HrcFuseSymbol.tsx

Props
-----
- component: CircuitComponent — reads properties like ratingAmps, poles, hrcType, hrcBreakingCapacityKa, controlCircuitVoltage, etc.
- nodeResult?: NodeResult
- onToggle: () => void — double-click handler
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Supports multi-pole rendering. For `control_circuit_fuse` it displays control circuit voltage and tag. For `hrc_fuse` it displays class and breaking capacity.
- Tripped state flashes via a 450ms interval.

Potential Issues / Things To Verify
----------------------------------
- No code changes were made.

Testing Notes
-------------
- Verify visual layout for 1/2/3 pole configurations and the tripped indicator.

Implementation Notes / Required Modifications
-------------------------------------------
- Uses setInterval for the tripped flash (450ms) with cleanup in the effect's return. This is correctly implemented. For extra robustness (especially during development with React Strict Mode), consider storing the interval id in a ref and clearing that in cleanup.
