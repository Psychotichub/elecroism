# ElectroSim — Component Analysis and Backlog

Date: 2026-06-07

This document lists all existing electrical and mechanical components within ElectroSim, evaluates their current working principles in the simulation engine (`src/simulation/engine.ts`), identifies limitations, and suggests areas for improvement. It also proposes new components suitable for expanding ElectroSim's industrial control and building management system (BMS) capabilities.

Legend: 
- ✅ **OK** — Working principle is fully simulated, mathematically sound, or visually correct for its intended application.
- ⚠️ **Partial** — Component is partially simulated but relies on simplifications, or some of its properties are documentation-only (unsimulated).
- ❌ **Passive / Graphical Only** — Component does not actively participate in potential propagation or load flow calculations (acting as visual decoration or simple structural assets).
- 💡 **Proposed Component** — Suggested new components to extend the system's realism.

---

## A. Power Supplies & Voltage Sources

### ✅ A1. Power Source (`power_source`)
Single-phase AC mains supply.
- **Working Principle**: Acts as a voltage potential seed (`live`, `neutral`, `pe`). Provides a configurable nominal AC voltage (default 230V).
- **What to Improve**:
  - Treat as an ideal voltage source with zero impedance. In real-world coordination, source impedance limits prospective short-circuit current. Introduce a `sourceImpedanceOhms` property to calculate realistic bolted fault levels rather than using generic constants.

### ✅ A2. DC Power Source (`dc_power_source`)
Maintained nominal DC voltage supply.
- **Working Principle**: Seeds DC positive (`PLUS`) and negative (`MINUS`) potentials. Serves as the primary source for 24V DC control loops.
- **What to Improve**:
  - Add optional ripple factor or battery charging limits if connected to DC backup systems.

### ✅ A3. Three-Phase Source (`three_phase_source`)
Three-phase AC supply (L1, L2, L3, N, PE).
- **Working Principle**: Seeds three distinct phase potentials (`liveL1`, `liveL2`, `liveL3`), `neutral`, and `pe`. Supports configurable line-to-line voltage (default 400V).
- **What to Improve**:
  - Integrate source phase sequence (R-Y-B vs B-Y-R) configuration. This would allow validating if downstream three-phase motors run in reverse.

### ✅ A4. AC/DC Converter (`ac_dc_converter`) & SMPS (`smps`)
Power supply units converting AC mains to DC.
- **Working Principle**: Detects if primary AC terminals are energized (both Live and Neutral must be active). If so, it seeds the output DC positive and negative terminals.
- **Primary-secondary coupling** (`chargerCoupling.ts`): AC fundamental current follows downstream DC bus load — `I_AC = (V_DC × I_DC) / (V_AC × η × PF)`. Configurable rated output power (W), efficiency (%), and input power factor. ✅
- **Overload shut-down**: DC output power above rated trips the supply (`tripped`) and de-energizes the DC bus; upstream series devices include charger primary current. ✅

### ✅ A5. Control Transformer (`control_transformer`)
Isolating control transformer stepping down AC voltage (e.g. 400V/230V to 110V/24V AC).
- **Working Principle**: Seeds secondary AC control potentials if primary AC terminals are energized.
- **What to Improve**:
  - Lacks transformer regulation curve (voltage drop under high control coil inrush, like when large contactors pull in). 
  - Add primary-to-secondary winding isolation faults check.

### ✅ A6. UPS Module (`ups_module`) & DC Battery Backup (`dc_battery_backup`)
Emergency battery backup devices.
- **Working Principle**: The UPS passes AC input to output via static bypass, or switches to battery inverter output upon AC mains failure. The DC Battery Backup acts as a secondary DC seed.
- **Battery discharge** (`batteryRuntime.ts`): `batteryRemainingAh` depletes on inverter backup proportional to output load; voltage sags with SoC; below cutoff the UPS trips and the DC bus drops. ✅
- **Charging path**: Configurable `upsChargeCurrentA` float-charges the battery when AC mains is present; charge power appears on the UPS AC input (upstream series devices). ✅

---

## B. Protective Devices

### ✅ B1. Miniature Circuit Breaker (`mcb` / `three_phase_mcb` / `four_phase_mcb`)
Single-pole and multi-pole MCBs.
- **Working Principle**: Conducts when closed ('on'). Evaluates branch current against magnetic trip multiple (B curve = 3x, C curve = 5x, D curve = 10x) and thermal rating. Transition to 'tripped' breaks potential propagation.
- **What to Improve**:
  - The multi-phase MCBs trip all phases simultaneously (common trip). However, they only evaluate thermal overload per-pole. 
  - Visual indication of the tripped state is good (flashing red indicator), but adding a manual trip button on the symbol would enhance user interaction.

### ✅ B2. MCCB (`mccb`) & Motorized MCCB (`motorized_mccb` / `four_pole_motorized_mccb`)
Molded case circuit breakers.
- **Working Principle**: Heavy-duty protection. Motorized versions integrate BMS control terminals (aux, trip, motor close, shunt trip).
- **What to Improve**:
  - Make auxiliary contacts follow the MCCB physical state dynamically. Currently, auxiliary tags are mostly documentation fields.
  - Check control supply voltage for motorized operations: if control supply is absent, motor command should fail.

### ✅ B3. Air Circuit Breaker (`air_circuit_breaker`)
Heavy-duty main circuit breaker (ACB).
- **Working Principle**: Fully simulated four-zone protection curve: Long-Time (L - inverse thermal), Short-Time (S - definite delay), Instantaneous (I - current-zero magnetic), and Earth-Fault (G - Ig definite delay). Includes extensive BMS DI/DO telemetry loops.
- **What to Improve**:
  - Excellent simulation depth. Ensure that the ACB visual faceplate displays the digital trip unit settings (Ir, Isd, Ii, Ig, tr, tsd, tg) in properties and draws the time-current coordination (TCC) curve dynamically.

### ✅ B4. Motor Protection Circuit Breaker (`motor_protection_circuit_breaker`)
MPCB with adjustable thermal class.
- **Working Principle**: Trips on overload (rating class 10/20/30) and magnetic short-circuits.
- **What to Improve**:
  - Phase failure / imbalance trip: MPCBs in real life have a differential mechanism that trips if one phase goes missing (single-phasing protection). Simulate single-phase sensitivity for 3-phase motors.

### ✅ B5. HRC Fuse (`hrc_fuse`) & Control Fuse (`control_circuit_fuse`)
Melting protection fuses.
- **Working Principle**: Melts and goes to 'tripped' when current exceeds thermal or magnetic thresholds. Fuses are one-time use (once tripped, they must be replaced).
- **What to Improve**:
  - Implement a "replace fuse" interactive action on the UI canvas (since fuses do not have "reset handles" like MCBs).

### ✅ B6. RCD / RCCB (`rcd` / `residual_current_circuit_breaker`) & Earth Leakage Relay (`earth_leakage_relay_cbct`)
Residual current devices.
- **Working Principle**: Detects earth faults and trips via vector residual current `I_residual = |VectorSum(I_L1, I_L2, I_L3, I_N)|` on the protected zone. Trips when `I_residual` exceeds sensitivity (e.g. 30 mA), honouring `rcdTripTimeMs` / `elrTripDelayMs`.
- **Simulation**: `residualCurrent.ts` — harmonic imbalance, 3φ unbalance, downstream L–N faults, and PE return paths (live-fed load with PE but no neutral).

### ✅ B7. Thermal Overload Relay (`overload_relay`)
Protective bimetallic relay for motors.
- **Working Principle**: Bimetal thermal integrator trips when heat reaches 100% — no instantaneous overload pickup on first evaluation.
- **Simulation**: `motorThermal.ts` IEC 60947-4-1 Class 10/20/30 inverse-time curve via `overloadTripClass`; `checkOverloadRelayFaults` advances `overloadSimState` each step using `simStepMs` / wall-clock Δt.

---

## C. Control & Switching Devices

### ✅ C1. Maintained Switches (`switch` / `two_way_switch`)
SPST, DPST, SPDT switches.
- **Working Principle**: Connects or disconnects poles. SPDT (two-way) routes COM to T1 or T2.
- **What to Improve**:
  - Add multi-way wiring validation (e.g., verifying intermediate switches in stairways).

### ✅ C2. Momentary Buttons (`push_button` / `estop`)
Normally open/normally closed buttons.
- **Working Principle**: Conducts only while pressed (`pressed: true`). E-stop latches open when clicked and requires twist-to-reset.
- **What to Improve**:
  - Renders correctly. Validate that E-stop loops interrupt the safety contactor circuit instantly.

### ✅ C3. Selector Switch (`selector_switch`)
3-position rotary switch (AUTO / OFF / MANUAL).
- **Working Principle**: OFF isolates COM; MANUAL bridges **COM ↔ MAN** for panel push-buttons; AUTO bridges **COM ↔ AUTO** and, when `atsController` is set, ATS/BMS `forcedContactorPickup` overrides which contactor closes.
- **Simulation**: `selectorSwitchRouting.ts` — routing modes, `mergeAtsSimulateOverrides` in `engine.simulate`, live `atsSequenceTimeMs` clock in the store.

### ✅ C4. Contactors & Relays (`contactor`, `relay`, `three_phase_contactor`, `four_phase_contactor`, `interposing_relay`)
Electromechanical switches.
- **Working Principle**: Coils are loads; when energized, the fixpoint algorithm closes associated main and auxiliary contacts.
- **What to Improve**:
  - **Coil Voltage Matching**: Coils are simulated as generic loads. Validate that the control supply voltage matches the coil rating (e.g., trying to power a 24V DC coil with 230V AC triggers a damage fault event).

### ✅ C5. Smart Relay (`smart_relay`) & Timers (`timer`)
Programmable controllers and time-delay relays.
- **Working Principle**: Timers implement ON-delay contact closure after coil energization (A1/A2); NC/NO swap when delay elapses. Smart relays read IN1/IN2 from terminal potentials and close T1↔T2 when A1/A2 is powered and the configured program (e.g. `OUT1 = IN1 AND NOT IN2`) evaluates true.
- **Implemented**: Property-panel logic editor with presets; fixpoint graph includes smart-relay outputs; timer delay uses `simStepMs` for stepped simulation.

### ⚠️ C6. Aux Contact Block (`aux_contact_block`)
Add-on auxiliary contacts mounted on contactors/relays.
- **Working Principle**: Follows the state of its parent component.
- **What to Improve**:
  - Improve the link editor UI to make linking aux blocks to contactor IDs intuitive.

### ⚠️ C7. Interlocking Devices (`mechanical_interlock` / `door_interlock` / `key_interlock`)
Safety interlocking mechanisms.
- **Working Principle**: Prevents concurrent closing of two contactors (mechanical interlock) or restricts switch closing (door/key interlocks).
- **What to Improve**:
  - Hardcode specific mechanical interlocks between contactors (e.g., Star-Delta or Forward-Reverse contactor pairs) so that energizing both simultaneously causes a short circuit or physical collision fault in validation.

### ⚠️ C8. Breaker Accessories (`motor_operator_kit`, `shunt_trip_coil`, `closing_coil`, `uvr_release`)
Breaker control accessories.
- **Working Principle**: Rendered as passive labels or auxiliary components.
- **What to Improve**:
  - Currently, these are mostly documentation assets. They should act as physical children to breakers. For example, triggering a pulse on a Shunt Trip Coil must physically trip its parent MCCB/ACB.

---

## D. Loads & Field Outputs

### ✅ D1. Lamps (`lamp` / `indicator_lamp` / `phase_indicator_bank`)
Illumination and status indicators.
- **Working Principle**: Consumes power based on rating. Renders color states when energized.
- **What to Improve**:
  - Indicator lamps validate AC/DC supply type matching correctly. Apply similar checks to phase indicator banks (warn if connected to DC).

### ✅ D2. Motors (`motor` / `three_phase_motor`)
Single-phase and three-phase AC motors.
- **Working Principle**: High-inrush loads. Implements thermal overload integration. Three-phase motor supports DOL and VFD drive modes.
- **What to Improve**:
  - **Inrush Current Simulation**: Integrate locked-rotor current (LRA) factor during starting transients. Currently, starting is simulated at nominal load currents.
  - VFD mode should dynamically introduce harmonics and adjust input power factor.

### ✅ D3. Heaters (`heater` / `panel_heater`) & Cooling Fans (`cooling_fan`)
Resistive heating and inductive ventilation.
- **Working Principle**: Pure resistive and inductive loads.
- **What to Improve**:
  - Add temperature coefficient validation: heating elements have a lower cold resistance (inrush spike) that stabilizes as they heat up.

### ✅ D4. Generic Load (`generic_load`) & Sockets (`socket`)
Configurable load profiles and plug outlets.
- **Working Principle**: Sockets act as load endpoints. Generic load allows custom W, VA, PF, and load type.
- **What to Improve**:
  - Add socket grounding loop impedance check: warn if PE is disconnected on the socket.

---

## E. Measurement & Instrumentation

### ✅ E1. Multimeter (`multimeter`)
Digital multimeter (DMM) with draggable probes.
- **Working Principle**: Measures voltage, current, and continuity between COM and Input probes by tracking potential propagation and terminal reachability.
- **What to Improve**:
  - The probe positioning and target selection can be finicky on dense sheets. Auto-snap probes to terminal blocks and component connections.

### ⚠️ E2. Energy Meters (`energy_meter` / `digital_multifunction_meter` / `power_quality_analyzer`)
Panel multifunction meters.
- **Working Principle**: Reads simulation node voltage, current, power factor, active power, and harmonics.
- **What to Improve**:
  - **CT & VT Scaling**: Real meters do not measure line currents directly; they connect to Current Transformers (e.g. 100/5A). Warn if the user connects line current directly to the meter without a CT, or if the CT primary ratio is misconfigured.

### ⚠️ E3. Transducers (`current_transformer` / `voltage_transformer`)
Instrument transformers.
- **Working Principle**: Passive indicators in schema.
- **What to Improve**:
  - **Signal Scaling**: Scale secondary current/voltage according to ratio (e.g., inputting 80A to a 100/5 CT must output 4A on the secondary terminal) and flow that value to connected measuring instruments.

---

## F. BMS & Industrial Communication

### ⚠️ F1. Network Gateways (`modbus_tcp_gateway` / `bacnet_ip_gateway`)
Supervisory communication interfaces.
- **Working Principle**: Validates Ethernet wiring categories.
- **What to Improve**:
  - Modbus/BACnet routing: Allow simulating simple queries. If a gateway is linked to an energy meter over a serial Modbus RTU link, validate that the meter comm address is unique and matched in the gateway's register map.

### ⚠️ F2. BMS I/O Modules (`di_module` / `do_module` / `ai_module` / `ao_module` / `relay_interface_card`)
BMS inputs and outputs.
- **Working Principle**: Represents control system channels.
- **What to Improve**:
  - **Logic Loop Linkages**: Link BMS output commands to interposing relays. For example, toggling a DO channel in the BMS control panel should trigger the linked relay coil in the simulation.
  - Analog modules: Support 0-10V or 4-20mA loop diagnostics (checking for open loops or scaling errors).

### ❌ F3. Infrastructure Communication (`communication_converter` / `iot_gateway` / `cloud_monitoring_module` / `energy_management_controller` / `ethernet_switch`)
Control network components.
- **Working Principle**: Passive components for documentation.
- **What to Improve**:
  - Add IP address conflict validation inside the sheet network check.
  - Warn if Modbus daisy chains exceed RS485 distance or node limits (e.g., maximum 32 devices per segment).

### ⚠️ F4. Signal Isolators (`signal_isolator` / `optocoupler_module`)
Analogue and digital isolation.
- **Working Principle**: Serves as passive series devices.
- **What to Improve**:
  - Verify isolation boundary: warn if an unisolated control signal (e.g. high-voltage AC) crosses directly into sensitive BMS low-voltage DC inputs without going through an optocoupler/isolator.

---

## G. Infrastructure & Enclosure Accessories

### ✅ G1. Power Bars (`busbar` / `busbar_system` / `neutral_bar_system` / `earth_bar_grounding_system`)
Heavy-duty distribution bars.
- **Working Principle**: Conducts current across multiple tap connection points.
- **What to Improve**:
  - Add thermal rating warnings: validate aggregate tap currents against the busbar's physical ampacity.

### ✅ G2. Terminal Block (`terminal_block`) & Disconnect Links (`neutral_link` / `earth_link`)
Wiring connectors and test disconnect switches.
- **Working Principle**: Passes potential.
- **What to Improve**:
  - Link verification: neutral disconnect links are opened during insulation resistance testing. Simulating open links must isolate neutral potential downstream.

### ❌ G3. Enclosure Accessories (`din_rail` / `mounting_plate` / `cable_duct` / `busbar_support_insulator` / `ferrule_cable_markers` / `ms_gi_sheet_enclosure` / `ip_rated_enclosure`)
Physical structural components.
- **Working Principle**: Purely graphical.
- **What to Improve**:
  - **Grounding Validation**: MS/GI enclosures and mounting plates must be connected to PE (ground). Flag an issue in validation if any sheet metal enclosure lacks a PE connection.
  - Enclosure fill calculation: calculate if cable ducts are overcrowded based on the number and cross-section of control/power wires passing through them.

---

## H. Plugins

### ✅ H1. Extension Component (`plugin_component`)
JSON-configured external component.
- **Working Principle**: Sandbox-evaluated conduction models (`pass_through`, `resistive_load`, `open`).
- **What to Improve**:
  - Expand plugin script capabilities to support custom time-delay equations or multi-terminal states.

---

## I. Proposed New Components

To expand the capability of ElectroSim for industrial panels and automated motor control centers (MCC), we propose adding the following components:

### 💡 I1. Variable Frequency Drive (VFD)
A key controller for motor speed.
- **Type**: Load/Source Hybrid
- **Properties**: Input Phase System (1-phase/3-phase), Rated Output Amps, Carrier Frequency, Motor Frequency (Hz), Acceleration Time, Deceleration Time, Control Terminals (Start/Stop, Forward/Reverse, Speed Ref 4-20mA, Fault Contacts).
- **Simulation Principle**: Consumes AC power on the primary side with a non-linear current waveform (highly harmonic, default 45% THD). Generates variable frequency and voltage AC on the secondary side to drive a three-phase motor.
- **Value**: Extremely common in modern MCC panels; allows simulating speed control, ramping, and harmonic feedback.

### 💡 I2. Motor Soft Starter
Solid-state motor starter.
- **Type**: Series Path Controller
- **Properties**: Bypass Contactor present (Y/N), Start Ramp Time (s), Initial Starting Voltage (%), Current Limit Factor (e.g. 3x In).
- **Simulation Principle**: Limits starting current transients during motor startup. Once ramp is complete, the bypass contactor closes (internal or external) to reduce solid-state losses.
- **Value**: Bridger between cheap DOL (Direct-On-Line) starters and expensive VFDs.

### 💡 I3. Phase Control & Voltage Monitoring Relay
Three-phase grid protection monitoring relay.
- **Type**: Control Series Protection
- **Properties**: Over-voltage Limit (V), Under-voltage Limit (V), Phase Imbalance Limit (%), Trip Delay (s), Output Contacts (SPDT).
- **Simulation Principle**: Analyzes phase-to-phase and phase-to-neutral voltages. If a phase loss, phase reversal, or voltage imbalance exceeds limits, it trips its output contact to drop the main contactor coil.
- **Value**: Mandatory protective relay for commercial/industrial incoming panels to prevent motor damage due to single-phasing or reverse rotation.

### 💡 I4. Surge Protection Device (SPD)
Surge arrester.
- **Type**: Parallel Protection
- **Properties**: Type (Class I / Class II), Max Continuous Operating Voltage (Uc), Nominal Discharge Current (In), Local Indication Contact.
- **Simulation Principle**: Standard high-impedance path to PE. Under high transient surge voltage (e.g., simulating a lightning strike scenario), it switches to a low-resistance path to dump current safely to earth. If triggered beyond rating, it switches to a fault state and opens its auxiliary contact.
- **Value**: Necessary for panels containing sensitive electronics (PLCs, BMS modules) in high-exposure areas.

### 💡 I5. Modular PLC (Programmable Logic Controller)
Custom control script engine.
- **Type**: Control Gateway
- **Properties**: CPU Power Supply, Expansion IO Card Count, Script File Link (`.js` or `.ladder`).
- **Simulation Principle**: Scans its physical DI terminals and runs a lightweight user-defined logic script (e.g., `OUT1 = DI1 && DI2`). Updates DO terminals at each simulation tick.
- **Value**: Elevates control system simulations from static bimetals to fully automated sequence control.

### 💡 I6. PTC Thermistor / Winding Temperature Sensor
Motor winding protection probe.
- **Type**: Transducer
- **Properties**: PTC Resistance Curve, Nominal Resistance at 25°C, Trip Temperature (°C).
- **Simulation Principle**: Resistance increases non-linearly with motor temperature (derived from motor thermal integration). Connects to a thermistor monitoring relay which trips control coils if resistance spikes.
- **Value**: Realistically models motor over-temperature protection under heavy starting cycles.
