MotorizedMCCBSymbol
===================

Summary
-------
MotorizedMCCBSymbol renders a motorized MCCB (motor pack on MCCB) with BMS metadata. Visually it follows the same frame and palette as `AirCircuitBreakerSymbol` (navy body, extended power terminals, BMS text rows). Control terminals use stubs and right-aligned labels.

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
- Displays 3P or 4P layout depending on `component.type` (`motorized_mccb` vs `four_pole_motorized_mccb`).
- Body and power leads match ACB-style geometry: body roughly y = −30…36, power connection points at **y = −36** and **y = 42** (see `motorizedMccbPowerConnectionPoints` in `src/store/circuitConnectionGeometry.ts`).
- `ensureMotorizedMccbConnectionPoints` normalizes saved components by terminal **label** so existing wires keep the same point ids when coordinates are updated.
- When BMS is enabled, renders BMS status at y = 20/28; when disabled, a single muted “BMS: off” line at y = 11.
- Control terminals (labels matching `^(MOT_|ST_|AUX_|TRIP_)`) are rendered with stubs from the body edge to **x = −46** and right-aligned labels — aligned with `mccbControlConnectionPoints` in geometry.
- Tripped state flashes an indicator using the shared **`useTripFlash`** hook (`src/hooks/useTripFlash.ts`): interval id stored in a ref, cleared on dependency change and unmount (Strict Mode–friendly).

Potential Issues / Things To Verify
----------------------------------
- **Control label regex:** `isControlTerminal` must stay in sync with `mccbControlConnectionPoints` labels in `circuitConnectionGeometry.ts` (currently `MOT_*`, `ST_*`, `AUX_*`, `TRIP_*`). Verified against that function.
- **Power vs symbol:** If you change pole positions or frame size in the symbol, update `motorizedMccbPowerConnectionPoints` (and re-run ensure) so grippers match the drawing.
- **Trip flash:** Implemented with `useTripFlash`; no duplicate-interval risk from the old inline `useEffect` pattern.

Testing Notes
-------------
- Verify double-click: onToggle when not tripped, onReset when tripped.
- Load an older circuit with motorized MCCB: power terminals should migrate to −36/42 and wires should still connect after `syncWireEndpoints` on load/simulate.
- Confirm control stubs and BMS-derived text for enabled/disabled BMS.

Implementation Notes / Required Modifications
-------------------------------------------
- To add new control terminals, extend both `mccbControlConnectionPoints` and the `isControlTerminal` regex (or derive the regex from a shared list of prefixes).
