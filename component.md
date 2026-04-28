# Component List

This list mirrors the current sidebar component palette.

## Power

- `power_source` - AC Source 230V
- `dc_power_source` - DC Supply (Adjustable V, + / -)
- `ac_dc_converter` - AC/DC Converter (Mains to DC bus, output adjustable)
- `three_phase_source` - 3phi Supply 400V (L1 L2 L3 + N)
- `busbar` - Busbar (Generic distribution bar)
- `busbar_system` - Busbar system
- `neutral_bar_system` - Neutral bar system
- `earth_bar_grounding_system` - Earth bar / grounding

## Protection

- `mcb` - MCB
- `hrc_fuse` - HRC fuse
- `control_circuit_fuse` - Control circuit fuse
- `earth_leakage_relay_cbct` - ELR + CBCT
- `rcd` - RCD
- `residual_current_circuit_breaker` - Residual current CB
- `overload_relay` - Overload Relay
- `three_phase_mcb` - 3P MCB
- `mccb` - MCCB
- `motor_protection_circuit_breaker` - MPCB
- `four_phase_mcb` - 4P MCB
- `air_circuit_breaker` - ACB
- `motorized_mccb` - Motor MCCB
- `four_pole_motorized_mccb` - 4P Motor MCCB

## Controls

- `switch` - Switch
- `push_button` - Push button
- `selector_switch` - Selector AUTO/MAN
- `contactor` - Contactor
- `relay` - Relay
- `smart_relay` - Smart relay
- `interposing_relay` - Interposing relay
- `aux_contact_block` - Aux contact block
- `timer` - Timer
- `three_phase_contactor` - 3P Contactor (KM)
- `four_phase_contactor` - 4P Contactor (KM)

## Safety

- `estop` - Emergency Stop
- `door_interlock` - Door interlock
- `mechanical_interlock` - Mechanical interlock

## Indicators & Metering

- `indicator_lamp` - Indicator lamp
- `phase_indicator_bank` - Phase indicator bank
- `energy_meter` - Energy meter
- `digital_multifunction_meter` - Digital multifunction meter
- `multimeter` - Digital multimeter

## Control Power

- `control_transformer` - Control transformer
- `smps` - SMPS 24V
- `ups_module` - UPS module
- `dc_battery_backup` - DC battery backup
- `motor_operator_kit` - Motor operator kit
- `shunt_trip_coil` - Shunt trip coil
- `closing_coil` - Closing coil
- `uvr_release` - UVR release

## BMS Communication

- `modbus_rtu_module` - Modbus RTU module
- `modbus_tcp_gateway` - Modbus TCP gateway
- `bacnet_ip_gateway` - BACnet/IP gateway
- `communication_converter` - Comm converter
- `iot_gateway` - IoT gateway
- `cloud_monitoring_module` - Cloud monitoring module
- `energy_management_controller` - Energy management controller
- `ethernet_switch` - Industrial Ethernet switch

## BMS I/O

- `di_module` - DI module
- `do_module` - DO module
- `ai_module` - AI module
- `ao_module` - AO module
- `relay_interface_card` - Relay interface card
- `signal_isolator` - Signal isolator
- `optocoupler_module` - Optocoupler module

## Infrastructure

- `panel_heater` - Panel heater
- `cooling_fan` - Cooling fan
- `key_interlock` - Key interlock
- `neutral_link` - Neutral link
- `earth_link` - Earth link
- `current_transformer` - Current transformer
- `voltage_transformer` - Voltage transformer
- `din_rail` - DIN rail
- `mounting_plate` - Mounting plate
- `cable_duct` - Cable duct
- `busbar_support_insulator` - Busbar support
- `ferrule_cable_markers` - Ferrules & markers
- `control_wiring` - Control wiring
- `power_cables` - Power cables
- `ms_gi_sheet_enclosure` - MS/GI sheet enclosure
- `ip_rated_enclosure` - IP rated enclosure
- `power_quality_analyzer` - Power quality analyzer

## Outlets

- `socket` - Socket

## Loads

- `lamp` - Lamp
- `motor` - Motor
- `three_phase_motor` - 3phi Motor
- `heater` - Heater
- `generic_load` - Generic load

## Wiring

- `junction` - Junction Point
- `terminal_block` - Terminal block

## Table View

| Group | Type | Label | Detail |
|---|---|---|---|
| Power | `power_source` | AC Source 230V | - |
| Power | `dc_power_source` | DC Supply | Adjustable V, + / - |
| Power | `ac_dc_converter` | AC/DC Converter | Mains to DC bus, output adjustable |
| Power | `three_phase_source` | 3phi Supply 400V | L1 L2 L3 + N |
| Power | `busbar` | Busbar | Generic distribution bar |
| Power | `busbar_system` | Busbar system | Main copper/aluminium distribution bar |
| Power | `neutral_bar_system` | Neutral bar system | Neutral distribution bar |
| Power | `earth_bar_grounding_system` | Earth bar / grounding | Protective earth distribution bar |
| Protection | `mcb` | MCB | 1P, rating in properties |
| Protection | `hrc_fuse` | HRC fuse | Cartridge fuse, replace after trip |
| Protection | `control_circuit_fuse` | Control circuit fuse | Low-amp fuse for control supply branch |
| Protection | `earth_leakage_relay_cbct` | ELR + CBCT | Earth fault relay with toroid CT |
| Protection | `rcd` | RCD | Sensitivity in properties |
| Protection | `residual_current_circuit_breaker` | Residual current CB | RCCB earth-leakage protection |
| Protection | `overload_relay` | Overload Relay | - |
| Protection | `three_phase_mcb` | 3P MCB | L1-L3, rating in properties |
| Protection | `mccb` | MCCB | 3P molded case circuit breaker |
| Protection | `motor_protection_circuit_breaker` | MPCB | Motor protection breaker, 3P |
| Protection | `four_phase_mcb` | 4P MCB | L1-L3 + N, rating in properties |
| Protection | `air_circuit_breaker` | ACB | 4P incomer, Ir / Ii / ST / earth G |
| Protection | `motorized_mccb` | Motor MCCB | 3P + BMS MOT / ST / aux / trip |
| Protection | `four_pole_motorized_mccb` | 4P Motor MCCB | L1-L3 + N + BMS control block |
| Controls | `switch` | Switch | SPST / DPST in properties |
| Controls | `push_button` | Push button | NO / NC in properties |
| Controls | `selector_switch` | Selector AUTO/MAN | 3-pos: COM to AUTO / MAN / OFF |
| Controls | `contactor` | Contactor | - |
| Controls | `relay` | Relay | - |
| Controls | `smart_relay` | Smart relay | Programmable compact control relay |
| Controls | `interposing_relay` | Interposing relay | 24 V DC coil, BMS interface |
| Controls | `aux_contact_block` | Aux contact block | 1NO (13-14) + 1NC (21-22) |
| Controls | `timer` | Timer | - |
| Controls | `three_phase_contactor` | 3P Contactor (KM) | L1-L3 + A1 A2, 13/14 NO, 21/22 NC |
| Controls | `four_phase_contactor` | 4P Contactor (KM) | L1-L3-N + A1 A2, 13/14, 21/22 |
| Safety | `estop` | Emergency Stop | NC mushroom, click latches |
| Safety | `door_interlock` | Door interlock | Panel door closed = contact closed |
| Safety | `mechanical_interlock` | Mechanical interlock | Mechanical ON/OFF prevention link |
| Indicators & Metering | `indicator_lamp` | Indicator lamp | Color + L1/L2/L3 tag in properties |
| Indicators & Metering | `phase_indicator_bank` | Phase indicator bank | L1/L2/L3 panel phase presence lamps |
| Indicators & Metering | `energy_meter` | Energy meter | V / A / kW, Modbus tag |
| Indicators & Metering | `digital_multifunction_meter` | Digital multifunction meter | V/A/kW/PF panel metering |
| Indicators & Metering | `multimeter` | Digital multimeter | Voltage / current / continuity + buzzer |
| Control Power | `control_transformer` | Control transformer | 415V/230V to 24V control supply |
| Control Power | `smps` | SMPS 24V | Mains AC to DC bus, adjustable V |
| Control Power | `ups_module` | UPS module | Control continuity backup |
| Control Power | `dc_battery_backup` | DC battery backup | Critical control reserve |
| Control Power | `motor_operator_kit` | Motor operator kit | Breaker remote ON/OFF actuator |
| Control Power | `shunt_trip_coil` | Shunt trip coil | Breaker remote OFF trip coil |
| Control Power | `closing_coil` | Closing coil | Breaker remote ON closing actuator |
| Control Power | `uvr_release` | UVR release | Undervoltage release hold coil |
| BMS Communication | `modbus_rtu_module` | Modbus RTU module | RS485 serial Modbus interface |
| BMS Communication | `modbus_tcp_gateway` | Modbus TCP gateway | Ethernet supervisory integration |
| BMS Communication | `bacnet_ip_gateway` | BACnet/IP gateway | BAS integration via UDP/IP |
| BMS Communication | `communication_converter` | Comm converter | RS232/RS485/Ethernet bridge |
| BMS Communication | `iot_gateway` | IoT gateway | Edge-to-cloud telemetry bridge |
| BMS Communication | `cloud_monitoring_module` | Cloud monitoring module | Remote dashboard and alert uplink |
| BMS Communication | `energy_management_controller` | Energy management controller | Supervisory optimization/control node |
| BMS Communication | `ethernet_switch` | Industrial Ethernet switch | Network fan-out for BMS devices |
| BMS I/O | `di_module` | DI module | Digital inputs from field contacts |
| BMS I/O | `do_module` | DO module | Digital outputs to relays/coils |
| BMS I/O | `ai_module` | AI module | Analog input (0-10V / 4-20mA) |
| BMS I/O | `ao_module` | AO module | Analog output (0-10V / 4-20mA) |
| BMS I/O | `relay_interface_card` | Relay interface card | Field relay isolation/fan-out |
| BMS I/O | `signal_isolator` | Signal isolator | Galvanic isolation for analog loops |
| BMS I/O | `optocoupler_module` | Optocoupler module | Digital optical isolation |
| Infrastructure | `panel_heater` | Panel heater | Anti-condensation enclosure heater |
| Infrastructure | `cooling_fan` | Cooling fan | Panel ventilation / heat removal |
| Infrastructure | `key_interlock` | Key interlock | Safe isolation sequence lock |
| Infrastructure | `neutral_link` | Neutral link | Neutral distribution bar |
| Infrastructure | `earth_link` | Earth link | Protective earth bar |
| Infrastructure | `current_transformer` | Current transformer | CT ratio for metering |
| Infrastructure | `voltage_transformer` | Voltage transformer | Potential transformer (VT) |
| Infrastructure | `din_rail` | DIN rail | Panel mounting rail |
| Infrastructure | `mounting_plate` | Mounting plate | Equipment backplate / chassis |
| Infrastructure | `cable_duct` | Cable duct | Wiring trunking / segregation path |
| Infrastructure | `busbar_support_insulator` | Busbar support | Insulated busbar support block |
| Infrastructure | `ferrule_cable_markers` | Ferrules & markers | Cable-end ferrules and wire IDs |
| Infrastructure | `control_wiring` | Control wiring | 1.5/2.5 sqmm control cabling |
| Infrastructure | `power_cables` | Power cables | Load-sized feeder/power cabling |
| Infrastructure | `ms_gi_sheet_enclosure` | MS/GI sheet enclosure | Sheet-metal panel body/chassis |
| Infrastructure | `ip_rated_enclosure` | IP rated enclosure | Panel housing IP54/IP65 |
| Infrastructure | `power_quality_analyzer` | Power quality analyzer | Harmonics/events monitoring |
| Outlets | `socket` | Socket | Schuko, rating in properties |
| Loads | `lamp` | Lamp | Power in properties |
| Loads | `motor` | Motor | 1phi, power in properties |
| Loads | `three_phase_motor` | 3phi Motor | Wye, power in properties |
| Loads | `heater` | Heater | Power in properties |
| Loads | `generic_load` | Generic load | - |
| Wiring | `junction` | Junction Point | - |
| Wiring | `terminal_block` | Terminal block | Pass-through terminal (IN/OUT) |
