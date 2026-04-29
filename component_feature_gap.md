# Component Feature Gap Audit

This file lists components that are present but appear to be not yet fully implemented with dedicated symbol/behavior paths.

## Shared Communication Symbol (`CommInfraSymbol`)

- `relay_interface_card`
- `modbus_rtu_module`
- `communication_converter`
- `iot_gateway`
- `cloud_monitoring_module`
- `energy_management_controller`
- `ethernet_switch`

## Shared BMS I/O Symbol (`BmsIOModuleSymbol`)

- `di_module`
- `do_module`
- `ai_module`
- `ao_module`

## Shared Isolation Symbol (`SignalIsolationSymbol`)

- `signal_isolator`
- `optocoupler_module`

## Shared Auxiliary Symbol (`PowerAuxSymbol`)

- `ups_module`
- `dc_battery_backup`
- `motor_operator_kit`
- `shunt_trip_coil`
- `closing_coil`
- `uvr_release`
- `key_interlock`
- `neutral_link`
- `earth_link`
- `current_transformer`
- `voltage_transformer`
- `din_rail`
- `mounting_plate`
- `cable_duct`
- `busbar_support_insulator`
- `ferrule_cable_markers`
- `control_wiring`
- `power_cables`
- `ms_gi_sheet_enclosure`
- `ip_rated_enclosure`
- `power_quality_analyzer`

## Likely Partial Behavior

- `digital_multifunction_meter` (shares energy-meter symbol/logic path)
- `mechanical_interlock` (shares door interlock symbol/flow)

## Notes

- Components not listed above generally have dedicated symbols and/or richer interaction logic in the current canvas implementation.
- This is an implementation-status view (feature completeness), not a correctness/quality verdict.

## Priority Matrix

| Group | Components | Priority | Why |
|---|---|---|---|
| Shared Communication Symbol (`CommInfraSymbol`) | `relay_interface_card`, `modbus_rtu_module`, `communication_converter`, `iot_gateway`, `cloud_monitoring_module`, `energy_management_controller`, `ethernet_switch` | High (In Progress) | Dedicated connection layouts and type-specific face details added; full per-device split still pending. |
| Shared BMS I/O Symbol (`BmsIOModuleSymbol`) | `di_module`, `do_module`, `ai_module`, `ao_module` | High (Completed) | Dedicated terminal layouts + module-specific visual identity implemented. |
| Shared Isolation Symbol (`SignalIsolationSymbol`) | `signal_isolator`, `optocoupler_module` | Medium (Completed) | Dedicated terminal maps, clearer face details, and distinct simulation bridge behavior implemented. |
| Shared Auxiliary Symbol (`PowerAuxSymbol`) | `ups_module`, `dc_battery_backup`, `motor_operator_kit`, `shunt_trip_coil`, `closing_coil`, `uvr_release`, `key_interlock`, `neutral_link`, `earth_link`, `current_transformer`, `voltage_transformer`, `din_rail`, `mounting_plate`, `cable_duct`, `busbar_support_insulator`, `ferrule_cable_markers`, `control_wiring`, `power_cables`, `ms_gi_sheet_enclosure`, `ip_rated_enclosure`, `power_quality_analyzer` | Medium-Low (Completed) | Operational subset now has dedicated terminals/visual/behavior paths, and remaining infra/layout items now use dedicated semantic terminal labeling with safe bridge logic where applicable. |
| Likely Partial Behavior | `digital_multifunction_meter`, `mechanical_interlock` | Medium (Completed) | Runtime behavior split implemented (DMFM state-controlled pass-through; mechanical interlock NC-style logic). |

## Recommended Implementation Order

1. **BMS I/O modules** (`di_module`, `do_module`, `ai_module`, `ao_module`) — **Completed**  
   - Dedicated symbols/terminal layouts implemented with channel-specific visual differentiation.
2. **Communication modules/gateways/switches** (`modbus_rtu_module`, `modbus_tcp_gateway` parity behaviors, `bacnet_ip_gateway` parity behaviors, `communication_converter`, `iot_gateway`, `cloud_monitoring_module`, `energy_management_controller`, `ethernet_switch`, `relay_interface_card`) — **In Progress**  
   - Protocol-aware terminal layouts and front-face differentiation added; deeper per-device behavior remains.
3. **Partial behavior completion** (`digital_multifunction_meter`, `mechanical_interlock`) — **Completed**  
   - Behavior separated from shared counterparts in simulation logic.
4. **Isolation modules** (`signal_isolator`, `optocoupler_module`) — **Completed**  
   - Dedicated I/O terminals, distinct visual semantics, and isolated behavior path logic added.
5. **Auxiliary/infrastructure family** (all items under `PowerAuxSymbol`) — **Completed**  
   - Prioritize operational-impact devices first (`uvr_release`, `shunt_trip_coil`, `closing_coil`, `current_transformer`, `voltage_transformer`, `power_quality_analyzer`), then documentation/layout assets.

## Progress Log

- **Step 1 completed:** BMS I/O modules now use dedicated terminal maps and module-specific front visuals.
- **Step 2 in progress:** Communication modules gained dedicated connection-point layouts and differentiated face details.
- **Step 3 completed:**  
  - `mechanical_interlock` now follows NC-style contact logic in simulation graph pathing.  
  - `digital_multifunction_meter` pass-through is state-controlled, separated from always-pass-through `energy_meter`.
- **Step 4 completed:**  
  - `signal_isolator` now uses dedicated analog in/out + supply terminals with explicit analog bridge behavior.  
  - `optocoupler_module` now uses dedicated isolated input/dry-output terminals and state-controlled bridge logic.
- **Step 5 completed:**  
  - Added dedicated terminals + type-specific canvas details for `uvr_release`, `shunt_trip_coil`, `closing_coil`, `current_transformer`, `voltage_transformer`, and `power_quality_analyzer`.  
  - Added dedicated simulation path logic for the same subset (`PQA` pass-through, CT/VT bridging, state-controlled coil continuity).  
  - Completed remaining auxiliary/infrastructure terminal semantics (`ups_module`, `dc_battery_backup`, `motor_operator_kit`, `key_interlock`, `neutral_link`, `earth_link`, `control_wiring`, `power_cables`, layout assets) plus safe bridge paths for neutral/earth/control/power link elements.
