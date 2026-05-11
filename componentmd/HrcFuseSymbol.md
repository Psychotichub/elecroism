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
- Tripped state flashes via `useTripFlash(isTripped, 450)`.

Potential Issues / Things To Verify
----------------------------------
- Trip flash timing (450 ms) is fixed in the hook call; change `HrcFuseSymbol` if a different cadence is required.

Testing Notes
-------------
- Verify visual layout for 1/2/3 pole configurations and the tripped indicator.

Implementation Notes / Required Modifications
-------------------------------------------
- Tripped flash uses `useTripFlash(isTripped, 450)` from `src/hooks/useTripFlash.ts` (ref-backed interval cleanup).


Real Life Feature, Working Principle, and Design
------------------------------------------------
High Rupturing Capacity (HRC) fuses contain a silver or copper element surrounded by arc-extinguishing powder (like quartz sand). When a short circuit occurs, the element melts and vaporizes instantly; the powder absorbs the arc energy, safely interrupting massive fault currents.
