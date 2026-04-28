import { create } from 'zustand';
import type {
  Circuit,
  CircuitComponent,
  Wire,
  SimulationResult,
  ToolMode,
  HistoryEntry,
  ConnectionPoint,
  ComponentType,
  ComponentProperties,
  FaultEvent,
  PhaseSystem,
} from '../types';
import { engine } from '../simulation/engine';
import { v4 as uuid } from 'uuid';
import {
  clampComponentScale,
  connectionPointWorld,
  orthogonalLeg,
  terminalOutwardOrientation,
} from '../utils/geometry';
import {
  inferWireColor,
  inferWireColorFromSingleTerminal,
} from '../utils/inferWireColor';

function getConnectionPointAbsolutePosition(
  circuit: Circuit,
  componentId: string,
  pointId: string
): { x: number; y: number } | null {
  const comp = circuit.components.find((c) => c.id === componentId);
  if (!comp) return null;
  const point = comp.connectionPoints.find((p) => p.id === pointId);
  if (!point) return null;
  return connectionPointWorld(comp, point);
}

type CreateConnectionPointsOptions = {
  /** Single-phase MCB: 1 pole (IN/OUT) or 2 pole (IN_L/OUT_L + IN_N/OUT_N). */
  mcbPoles?: 1 | 2;
};

function createMcbConnectionPoints(
  componentId: string,
  poles: 1 | 2
): ConnectionPoint[] {
  if (poles === 2) {
    return [
      { id: uuid(), componentId, x: -10, y: -25, label: 'IN_L' },
      { id: uuid(), componentId, x: -10, y: 25, label: 'OUT_L' },
      { id: uuid(), componentId, x: 10, y: -25, label: 'IN_N' },
      { id: uuid(), componentId, x: 10, y: 25, label: 'OUT_N' },
    ];
  }
  return [
    { id: uuid(), componentId, x: 0, y: -25, label: 'IN' },
    { id: uuid(), componentId, x: 0, y: 25, label: 'OUT' },
  ];
}

function syncWireEndpoints(circuit: Circuit): Circuit {
  return {
    ...circuit,
    wires: circuit.wires.map((wire) => {
      const fromPos = getConnectionPointAbsolutePosition(
        circuit,
        wire.fromComponentId,
        wire.fromPointId
      );
      const toPos = getConnectionPointAbsolutePosition(
        circuit,
        wire.toComponentId,
        wire.toPointId
      );

      if (!fromPos || !toPos) return wire;

      const points =
        wire.points.length >= 4
          ? [...wire.points]
          : [fromPos.x, fromPos.y, toPos.x, toPos.y];

      points[0] = fromPos.x;
      points[1] = fromPos.y;
      points[points.length - 2] = toPos.x;
      points[points.length - 1] = toPos.y;

      return { ...wire, points };
    }),
  };
}

/** BMS / motor-pack control terminals (diagram only — not in power graph). */
function acbControlConnectionPoints(componentId: string): ConnectionPoint[] {
  const x = -46;
  const rows: [number, string][] = [
    [-26, 'CC_A1'],
    [-18, 'CC_A2'],
    [-10, 'ST_A1'],
    [-2, 'ST_A2'],
    [6, 'UVR_A1'],
    [14, 'UVR_A2'],
    [22, 'AUX_52A'],
    [30, 'AUX_52B'],
    [38, 'AUX_TRIP'],
  ];
  return rows.map(([y, label]) => ({
    id: uuid(),
    componentId,
    x,
    y,
    label,
  }));
}

function ensureAcbControlConnectionPoints(
  component: CircuitComponent
): CircuitComponent {
  if (component.type !== 'air_circuit_breaker') return component;
  if (component.connectionPoints.some((p) => p.label === 'CC_A1')) {
    return component;
  }
  return {
    ...component,
    connectionPoints: [
      ...component.connectionPoints,
      ...acbControlConnectionPoints(component.id),
    ],
  };
}

/** BMS control block for motorized MCCB (motor ON, shunt, aux changeover, trip contact). */
function mccbControlConnectionPoints(componentId: string): ConnectionPoint[] {
  const x = -46;
  const rows: [number, string][] = [
    [-26, 'MOT_A1'],
    [-18, 'MOT_A2'],
    [-10, 'ST_A1'],
    [-2, 'ST_A2'],
    [6, 'AUX_COM'],
    [14, 'AUX_NO'],
    [22, 'AUX_NC'],
    [30, 'TRIP_T1'],
    [38, 'TRIP_T2'],
  ];
  return rows.map(([y, label]) => ({
    id: uuid(),
    componentId,
    x,
    y,
    label,
  }));
}

function ensureMccbControlConnectionPoints(
  component: CircuitComponent
): CircuitComponent {
  if (
    component.type !== 'motorized_mccb' &&
    component.type !== 'four_pole_motorized_mccb'
  ) {
    return component;
  }
  if (component.connectionPoints.some((p) => p.label === 'MOT_A1')) {
    return component;
  }
  return {
    ...component,
    connectionPoints: [
      ...component.connectionPoints,
      ...mccbControlConnectionPoints(component.id),
    ],
  };
}

/**
 * IEC auxiliary contact terminals on contactors (and 3P/4P variants).
 *  - 13-14: NO contact (closed when coil energised, used to "hold" / latch
 *    around the start push-button).
 *  - 21-22: NC contact (closed when coil de-energised, typically used for
 *    interlocks or stop-button logic).
 * Block sits below the body so it does not collide with the main poles.
 */
function contactorAuxConnectionPoints(componentId: string): ConnectionPoint[] {
  return [
    { id: uuid(), componentId, x: -12, y: 38, label: '13' },
    { id: uuid(), componentId, x: -12, y: 50, label: '14' },
    { id: uuid(), componentId, x: 12, y: 38, label: '21' },
    { id: uuid(), componentId, x: 12, y: 50, label: '22' },
  ];
}

function ensureContactorAuxTerminals(
  component: CircuitComponent
): CircuitComponent {
  if (
    component.type !== 'contactor' &&
    component.type !== 'three_phase_contactor' &&
    component.type !== 'four_phase_contactor'
  ) {
    return component;
  }
  if (component.connectionPoints.some((p) => p.label === '13')) {
    return component;
  }
  return {
    ...component,
    connectionPoints: [
      ...component.connectionPoints,
      ...contactorAuxConnectionPoints(component.id),
    ],
  };
}

function ensureBreakerControlTerminals(
  component: CircuitComponent
): CircuitComponent {
  return ensureContactorAuxTerminals(
    ensureMccbControlConnectionPoints(
      ensureAcbControlConnectionPoints(component)
    )
  );
}

function createConnectionPoints(
  componentId: string,
  type: ComponentType,
  options?: CreateConnectionPointsOptions
): ConnectionPoint[] {
  switch (type) {
    case 'power_source':
      return [
        { id: uuid(), componentId, x: -16, y: 32, label: 'L_OUT' },
        { id: uuid(), componentId, x: 16, y: 32, label: 'N_OUT' },
      ];
    case 'dc_power_source':
      return [
        { id: uuid(), componentId, x: -16, y: 32, label: 'DC_PLUS' },
        { id: uuid(), componentId, x: 16, y: 32, label: 'DC_MINUS' },
      ];
    case 'ac_dc_converter':
      return [
        { id: uuid(), componentId, x: -18, y: -22, label: 'AC_L' },
        { id: uuid(), componentId, x: 18, y: -22, label: 'AC_N' },
        { id: uuid(), componentId, x: -18, y: 22, label: 'DC_PLUS' },
        { id: uuid(), componentId, x: 18, y: 22, label: 'DC_MINUS' },
      ];
    case 'control_transformer':
      return [
        { id: uuid(), componentId, x: -18, y: -22, label: 'PRI_L' },
        { id: uuid(), componentId, x: 18, y: -22, label: 'PRI_N' },
        { id: uuid(), componentId, x: -18, y: 22, label: 'SEC_L' },
        { id: uuid(), componentId, x: 18, y: 22, label: 'SEC_N' },
      ];
    case 'modbus_tcp_gateway':
    case 'bacnet_ip_gateway':
      return [
        { id: uuid(), componentId, x: -12, y: -22, label: 'PWR_L' },
        { id: uuid(), componentId, x: 12, y: -22, label: 'PWR_N' },
      ];
    case 'modbus_rtu_module':
      return [
        { id: uuid(), componentId, x: -12, y: -22, label: 'PWR_L' },
        { id: uuid(), componentId, x: 12, y: -22, label: 'PWR_N' },
        { id: uuid(), componentId, x: -12, y: 22, label: 'RS485_A' },
        { id: uuid(), componentId, x: 12, y: 22, label: 'RS485_B' },
      ];
    case 'di_module':
    case 'do_module':
    case 'ai_module':
    case 'ao_module':
    case 'relay_interface_card':
    case 'communication_converter':
    case 'iot_gateway':
    case 'cloud_monitoring_module':
    case 'energy_management_controller':
    case 'ethernet_switch':
    case 'signal_isolator':
    case 'optocoupler_module':
    case 'ups_module':
    case 'dc_battery_backup':
    case 'motor_operator_kit':
    case 'shunt_trip_coil':
    case 'closing_coil':
    case 'uvr_release':
    case 'key_interlock':
    case 'neutral_link':
    case 'earth_link':
    case 'current_transformer':
    case 'voltage_transformer':
    case 'din_rail':
    case 'mounting_plate':
    case 'cable_duct':
    case 'busbar_support_insulator':
    case 'ferrule_cable_markers':
    case 'control_wiring':
    case 'power_cables':
    case 'ms_gi_sheet_enclosure':
    case 'ip_rated_enclosure':
    case 'power_quality_analyzer':
      return [
        { id: uuid(), componentId, x: -12, y: -22, label: 'PWR_L' },
        { id: uuid(), componentId, x: 12, y: -22, label: 'PWR_N' },
      ];
    case 'three_phase_source':
      return [
        { id: uuid(), componentId, x: -20, y: -32, label: 'L1_OUT' },
        { id: uuid(), componentId, x: 0, y: -32, label: 'L2_OUT' },
        { id: uuid(), componentId, x: 20, y: -32, label: 'L3_OUT' },
        { id: uuid(), componentId, x: 0, y: 32, label: 'N_OUT' },
      ];
    case 'three_phase_motor':
      return [
        { id: uuid(), componentId, x: -20, y: -22, label: 'L1' },
        { id: uuid(), componentId, x: 0, y: -22, label: 'L2' },
        { id: uuid(), componentId, x: 20, y: -22, label: 'L3' },
        { id: uuid(), componentId, x: 0, y: 22, label: 'N' },
      ];
    case 'three_phase_mcb':
    case 'mccb':
    case 'motor_protection_circuit_breaker':
      return [
        { id: uuid(), componentId, x: -20, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -20, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 20, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 20, y: 25, label: 'OUT_L3' },
      ];
    case 'motorized_mccb':
      return [
        { id: uuid(), componentId, x: -20, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -20, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 20, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 20, y: 25, label: 'OUT_L3' },
        ...mccbControlConnectionPoints(componentId),
      ];
    case 'four_pole_motorized_mccb':
      return [
        { id: uuid(), componentId, x: -30, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -30, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: -10, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: -10, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 10, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 10, y: 25, label: 'OUT_L3' },
        { id: uuid(), componentId, x: 30, y: -25, label: 'IN_N' },
        { id: uuid(), componentId, x: 30, y: 25, label: 'OUT_N' },
        ...mccbControlConnectionPoints(componentId),
      ];
    case 'four_phase_mcb':
      return [
        { id: uuid(), componentId, x: -30, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -30, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: -10, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: -10, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 10, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 10, y: 25, label: 'OUT_L3' },
        { id: uuid(), componentId, x: 30, y: -25, label: 'IN_N' },
        { id: uuid(), componentId, x: 30, y: 25, label: 'OUT_N' },
      ];
    case 'air_circuit_breaker':
      return [
        { id: uuid(), componentId, x: -30, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -30, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: -10, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: -10, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 10, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 10, y: 25, label: 'OUT_L3' },
        { id: uuid(), componentId, x: 30, y: -25, label: 'IN_N' },
        { id: uuid(), componentId, x: 30, y: 25, label: 'OUT_N' },
        ...acbControlConnectionPoints(componentId),
      ];
    case 'switch':
    case 'push_button':
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'OUT' },
      ];
    case 'mcb':
      return createMcbConnectionPoints(
        componentId,
        options?.mcbPoles === 2 ? 2 : 1
      );
    case 'hrc_fuse':
    case 'control_circuit_fuse':
      return [
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT' },
      ];
    case 'earth_leakage_relay_cbct':
      return [
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT' },
      ];
    case 'rcd':
    case 'residual_current_circuit_breaker':
    case 'overload_relay':
      return [
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT' },
      ];
    case 'socket':
      return [
        { id: uuid(), componentId, x: -10, y: -20, label: 'L' },
        { id: uuid(), componentId, x: 10, y: -20, label: 'N' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'PE' },
      ];
    case 'lamp':
    case 'motor':
    case 'heater':
    case 'panel_heater':
    case 'cooling_fan':
    case 'generic_load':
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: 'T1' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'T2' },
      ];
    case 'busbar':
    case 'busbar_system':
    case 'neutral_bar_system':
    case 'earth_bar_grounding_system':
      return Array.from({ length: 6 }, (_, i) => ({
        id: uuid(),
        componentId,
        x: -50 + i * 20,
        y: 0,
        label: `TAP_${i + 1}`,
      }));
    case 'terminal_block':
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'OUT' },
      ];
    case 'junction':
      return [
        { id: uuid(), componentId, x: 0, y: -8, label: 'T1' },
        { id: uuid(), componentId, x: 8, y: 0, label: 'T2' },
        { id: uuid(), componentId, x: 0, y: 8, label: 'T3' },
        { id: uuid(), componentId, x: -8, y: 0, label: 'T4' },
      ];
    case 'contactor':
    case 'relay':
    case 'smart_relay':
    case 'timer':
      return [
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT' },
        { id: uuid(), componentId, x: -20, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 20, y: 0, label: 'A2' },
        ...(type === 'contactor' ? contactorAuxConnectionPoints(componentId) : []),
      ];
    case 'three_phase_contactor':
      return [
        { id: uuid(), componentId, x: -20, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -20, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: 0, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 20, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 20, y: 25, label: 'OUT_L3' },
        { id: uuid(), componentId, x: -36, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 36, y: 0, label: 'A2' },
        ...contactorAuxConnectionPoints(componentId),
      ];
    case 'four_phase_contactor':
      return [
        { id: uuid(), componentId, x: -30, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -30, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: -10, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: -10, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 10, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 10, y: 25, label: 'OUT_L3' },
        { id: uuid(), componentId, x: 30, y: -25, label: 'IN_N' },
        { id: uuid(), componentId, x: 30, y: 25, label: 'OUT_N' },
        { id: uuid(), componentId, x: -44, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 44, y: 0, label: 'A2' },
        ...contactorAuxConnectionPoints(componentId),
      ];
    case 'estop':
      // IEC mushroom NC: IN top, OUT bottom — series device that opens when
      // the head is pressed (latched). Reset via Properties → Reset.
      return [
        { id: uuid(), componentId, x: 0, y: -22, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 22, label: 'OUT' },
      ];
    case 'door_interlock':
    case 'mechanical_interlock':
      // Guarded door switch in series with control loop.
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'OUT' },
      ];
    case 'selector_switch':
      // 3-position rotary: COM at top, AUTO bottom-left, MANUAL bottom-right.
      // The OFF position simply opens both branches.
      return [
        { id: uuid(), componentId, x: 0, y: -22, label: 'COM' },
        { id: uuid(), componentId, x: -16, y: 22, label: 'AUTO' },
        { id: uuid(), componentId, x: 16, y: 22, label: 'MAN' },
      ];
    case 'indicator_lamp':
      // Panel-front signal lamp: L (line side) + N (neutral). Lights up when
      // both terminals see line ↔ neutral potentials (any phase).
      return [
        { id: uuid(), componentId, x: 0, y: -16, label: 'L' },
        { id: uuid(), componentId, x: 0, y: 16, label: 'N' },
      ];
    case 'phase_indicator_bank':
      return [
        { id: uuid(), componentId, x: -24, y: -24, label: 'L1' },
        { id: uuid(), componentId, x: -8, y: -24, label: 'L2' },
        { id: uuid(), componentId, x: 8, y: -24, label: 'L3' },
        { id: uuid(), componentId, x: 24, y: -24, label: 'N' },
      ];
    case 'smps':
      // Switch-mode PSU: AC mains in (L/N) → DC out (V+ / V−). Same engine
      // behaviour as ac_dc_converter but a distinct industrial symbol.
      return [
        { id: uuid(), componentId, x: -18, y: -22, label: 'AC_L' },
        { id: uuid(), componentId, x: 18, y: -22, label: 'AC_N' },
        { id: uuid(), componentId, x: -18, y: 22, label: 'DC_PLUS' },
        { id: uuid(), componentId, x: 18, y: 22, label: 'DC_MINUS' },
      ];
    case 'interposing_relay':
      // BMS-interface relay: 24 V DC coil A1/A2, dry NO contact IN/OUT.
      // Sized smaller than a normal control relay; no 13/14/21/22 aux block.
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'OUT' },
        { id: uuid(), componentId, x: -16, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 16, y: 0, label: 'A2' },
      ];
    case 'aux_contact_block':
      return [
        { id: uuid(), componentId, x: -16, y: -20, label: '13' },
        { id: uuid(), componentId, x: 16, y: -20, label: '14' },
        { id: uuid(), componentId, x: -16, y: 20, label: '21' },
        { id: uuid(), componentId, x: 16, y: 20, label: '22' },
      ];
    case 'energy_meter':
    case 'digital_multifunction_meter':
      // 3φ + N pass-through multifunction meter (current via internal CTs).
      // Ports labelled IN_L1..IN_N (top) and OUT_L1..OUT_N (bottom) so the
      // engine bridges them like a busbar segment without protection logic.
      return [
        { id: uuid(), componentId, x: -30, y: -25, label: 'IN_L1' },
        { id: uuid(), componentId, x: -30, y: 25, label: 'OUT_L1' },
        { id: uuid(), componentId, x: -10, y: -25, label: 'IN_L2' },
        { id: uuid(), componentId, x: -10, y: 25, label: 'OUT_L2' },
        { id: uuid(), componentId, x: 10, y: -25, label: 'IN_L3' },
        { id: uuid(), componentId, x: 10, y: 25, label: 'OUT_L3' },
        { id: uuid(), componentId, x: 30, y: -25, label: 'IN_N' },
        { id: uuid(), componentId, x: 30, y: 25, label: 'OUT_N' },
      ];
    case 'multimeter':
      return [
        { id: uuid(), componentId, x: -14, y: 28, label: 'COM' },
        { id: uuid(), componentId, x: 14, y: 28, label: 'VΩA' },
      ];
    default:
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: 'IN' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'OUT' },
      ];
  }
}

function labelNorm(s: string): string {
  return s.replace(/\s+/g, '').toUpperCase();
}

/** Effective 1P vs 2P layout for an MCB (from properties or legacy connection labels). */
function mcbLayoutPoles(comp: CircuitComponent): 1 | 2 {
  if (comp.type !== 'mcb') return 1;
  if (comp.properties.poles === 2) return 2;
  if (
    comp.connectionPoints.some((cp) => labelNorm(cp.label) === 'IN_L')
  ) {
    return 2;
  }
  return 1;
}

function remapWireEndpointsForMorph(
  wires: Wire[],
  componentId: string,
  oldToNewPointId: Map<string, string>
): Wire[] {
  return wires
    .map((w) => {
      let fromPointId = w.fromPointId;
      let toPointId = w.toPointId;
      if (w.fromComponentId === componentId) {
        const n = oldToNewPointId.get(w.fromPointId);
        if (n === undefined) return null;
        fromPointId = n;
      }
      if (w.toComponentId === componentId) {
        const n = oldToNewPointId.get(w.toPointId);
        if (n === undefined) return null;
        toPointId = n;
      }
      return { ...w, fromPointId, toPointId };
    })
    .filter((w): w is Wire => w !== null);
}

function buildPointRemapByLabels(
  oldComp: CircuitComponent,
  newCps: ConnectionPoint[],
  pairs: [string, string][]
): Map<string, string> {
  const newByLabel = new Map(
    newCps.map((cp) => [labelNorm(cp.label), cp.id] as const)
  );
  const m = new Map<string, string>();
  for (const cp of oldComp.connectionPoints) {
    const hit = pairs.find(
      ([from]) => labelNorm(from) === labelNorm(cp.label)
    );
    if (!hit) continue;
    const newId = newByLabel.get(labelNorm(hit[1]));
    if (newId) m.set(cp.id, newId);
  }
  return m;
}

/** Target canvas `type` when user sets phase system (may equal current). */
function resolveTypeFromPhasePreference(
  type: ComponentType,
  phase: PhaseSystem
): ComponentType {
  if (phase === 'three_phase') {
    switch (type) {
      case 'power_source':
        return 'three_phase_source';
      case 'motor':
        return 'three_phase_motor';
      case 'mcb':
        return 'three_phase_mcb';
      case 'contactor':
      case 'relay':
      case 'timer':
        return 'three_phase_contactor';
      default:
        return type;
    }
  }
  switch (type) {
    case 'three_phase_source':
      return 'power_source';
    case 'three_phase_motor':
      return 'motor';
    case 'three_phase_mcb':
    case 'four_phase_mcb':
      return 'mcb';
    case 'three_phase_contactor':
    case 'four_phase_contactor':
      return 'contactor';
    default:
      return type;
  }
}

function morphLabelPairs(
  fromComp: CircuitComponent,
  toType: ComponentType
): [string, string][] | null {
  const fromType = fromComp.type;
  if (fromType === 'power_source' && toType === 'three_phase_source') {
    return [
      ['L_OUT', 'L1_OUT'],
      ['N_OUT', 'N_OUT'],
    ];
  }
  if (fromType === 'three_phase_source' && toType === 'power_source') {
    return [
      ['L1_OUT', 'L_OUT'],
      ['N_OUT', 'N_OUT'],
    ];
  }
  if (fromType === 'motor' && toType === 'three_phase_motor') {
    return [
      ['T1', 'L1'],
      ['T2', 'N'],
    ];
  }
  if (fromType === 'three_phase_motor' && toType === 'motor') {
    return [
      ['L1', 'T1'],
      ['N', 'T2'],
    ];
  }
  if (fromType === 'mcb' && toType === 'three_phase_mcb') {
    if (mcbLayoutPoles(fromComp) === 2) {
      return [
        ['IN_L', 'IN_L1'],
        ['OUT_L', 'OUT_L1'],
      ];
    }
    return [
      ['IN', 'IN_L1'],
      ['OUT', 'OUT_L1'],
    ];
  }
  if (
    (fromType === 'three_phase_mcb' || fromType === 'four_phase_mcb') &&
    toType === 'mcb'
  ) {
    if (fromType === 'four_phase_mcb') {
      return [
        ['IN_L1', 'IN_L'],
        ['OUT_L1', 'OUT_L'],
        ['IN_N', 'IN_N'],
        ['OUT_N', 'OUT_N'],
      ];
    }
    return [
      ['IN_L1', 'IN'],
      ['OUT_L1', 'OUT'],
    ];
  }
  if (
    (fromType === 'contactor' ||
      fromType === 'relay' ||
      fromType === 'timer') &&
    toType === 'three_phase_contactor'
  ) {
    return [
      ['IN', 'IN_L1'],
      ['OUT', 'OUT_L1'],
      ['A1', 'A1'],
      ['A2', 'A2'],
    ];
  }
  if (
    (fromType === 'three_phase_contactor' ||
      fromType === 'four_phase_contactor') &&
    toType === 'contactor'
  ) {
    return [
      ['IN_L1', 'IN'],
      ['OUT_L1', 'OUT'],
      ['A1', 'A1'],
      ['A2', 'A2'],
    ];
  }
  return null;
}

function mergedPropsMorph(
  comp: CircuitComponent,
  toType: ComponentType
): ComponentProperties {
  const base = getDefaultProperties(toType);
  const p = comp.properties;

  if (comp.type === 'power_source' && toType === 'three_phase_source') {
    const vLn = p.voltage || 230;
    const vLL = vLn * Math.sqrt(3);
    return {
      ...base,
      phaseSystem: 'three_phase',
      lineVoltage: vLL,
      voltage: vLL,
      phaseVoltage: vLn,
    };
  }
  if (comp.type === 'three_phase_source' && toType === 'power_source') {
    const vLn =
      p.phaseVoltage ?? (p.lineVoltage ?? 400) / Math.sqrt(3);
    return {
      ...base,
      phaseSystem: 'single_phase',
      voltage: Math.round(vLn * 10) / 10,
    };
  }
  if (comp.type === 'motor' && toType === 'three_phase_motor') {
    return {
      ...base,
      powerWatts: p.powerWatts ?? base.powerWatts,
      loadType: p.loadType ?? base.loadType,
      powerFactor: p.powerFactor ?? base.powerFactor,
      ratedLineAmps: p.ratedLineAmps,
      lineVoltage: p.lineVoltage ?? base.lineVoltage,
      phaseSystem: 'three_phase',
    };
  }
  if (comp.type === 'three_phase_motor' && toType === 'motor') {
    const vLn =
      p.phaseVoltage ??
      (p.lineVoltage ? p.lineVoltage / Math.sqrt(3) : undefined);
    return {
      ...base,
      powerWatts: p.powerWatts ?? base.powerWatts,
      loadType: p.loadType ?? base.loadType,
      powerFactor: p.powerFactor ?? base.powerFactor,
      voltage: vLn !== undefined ? Math.round(vLn * 10) / 10 : 230,
      phaseSystem: 'single_phase',
    };
  }
  if (comp.type === 'mcb' && toType === 'three_phase_mcb') {
    return {
      ...base,
      ratingAmps: p.ratingAmps ?? base.ratingAmps,
      tripCurve: p.tripCurve ?? base.tripCurve,
      breakingCapacity: p.breakingCapacity ?? base.breakingCapacity,
      lineVoltage: p.lineVoltage ?? base.lineVoltage,
      phaseSystem: 'three_phase',
    };
  }
  if (comp.type === 'four_phase_mcb' && toType === 'mcb') {
    return {
      ...base,
      ratingAmps: p.ratingAmps ?? base.ratingAmps,
      tripCurve: p.tripCurve ?? base.tripCurve,
      breakingCapacity: p.breakingCapacity ?? base.breakingCapacity,
      poles: 2,
      lineVoltage: p.lineVoltage ?? base.lineVoltage,
      phaseSystem: 'single_phase',
    };
  }
  if (comp.type === 'three_phase_mcb' && toType === 'mcb') {
    return {
      ...base,
      ratingAmps: p.ratingAmps ?? base.ratingAmps,
      tripCurve: p.tripCurve ?? base.tripCurve,
      breakingCapacity: p.breakingCapacity ?? base.breakingCapacity,
      poles: 1,
      phaseSystem: 'single_phase',
    };
  }
  if (
    (comp.type === 'contactor' ||
      comp.type === 'relay' ||
      comp.type === 'timer') &&
    toType === 'three_phase_contactor'
  ) {
    return {
      ...base,
      ratingAmps: p.ratingAmps ?? base.ratingAmps,
      lineVoltage: p.lineVoltage ?? base.lineVoltage,
      phaseSystem: 'three_phase',
    };
  }
  if (
    (comp.type === 'three_phase_contactor' ||
      comp.type === 'four_phase_contactor') &&
    toType === 'contactor'
  ) {
    return {
      ...base,
      ratingAmps: p.ratingAmps ?? base.ratingAmps,
      phaseSystem: 'single_phase',
    };
  }
  return { ...base, ...p, phaseSystem: p.phaseSystem ?? base.phaseSystem };
}

function getDefaultProperties(type: ComponentType): ComponentProperties {
  switch (type) {
    case 'power_source':
      return { voltage: 230, phaseSystem: 'single_phase' };
    case 'dc_power_source':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'ac_dc_converter':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'control_transformer':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'modbus_tcp_gateway':
      return {
        gatewayIp: '192.168.1.100',
        gatewayPort: 502,
        phaseSystem: 'single_phase',
      };
    case 'modbus_rtu_module':
      return {
        ioChannels: 1,
        phaseSystem: 'single_phase',
      };
    case 'bacnet_ip_gateway':
      return {
        gatewayIp: '192.168.1.110',
        gatewayPort: 47808,
        phaseSystem: 'single_phase',
      };
    case 'di_module':
      return { ioChannels: 8, phaseSystem: 'single_phase' };
    case 'do_module':
      return { ioChannels: 8, phaseSystem: 'single_phase' };
    case 'ai_module':
      return {
        ioChannels: 4,
        aiSignalType: '0_10v',
        phaseSystem: 'single_phase',
      };
    case 'ao_module':
      return {
        ioChannels: 4,
        aoSignalType: '0_10v',
        phaseSystem: 'single_phase',
      };
    case 'relay_interface_card':
      return { ioChannels: 8, phaseSystem: 'single_phase' };
    case 'communication_converter':
      return {
        gatewayIp: '192.168.1.120',
        gatewayPort: 502,
        phaseSystem: 'single_phase',
      };
    case 'iot_gateway':
      return {
        gatewayIp: '10.10.10.10',
        gatewayPort: 8883,
        ioChannels: 1,
        phaseSystem: 'single_phase',
      };
    case 'cloud_monitoring_module':
      return {
        gatewayIp: 'cloud.bms.local',
        gatewayPort: 443,
        ioChannels: 1,
        phaseSystem: 'single_phase',
      };
    case 'energy_management_controller':
      return {
        gatewayIp: '192.168.1.210',
        gatewayPort: 502,
        ioChannels: 16,
        phaseSystem: 'single_phase',
      };
    case 'ethernet_switch':
      return {
        ioChannels: 5,
        gatewayIp: '192.168.1.200',
        phaseSystem: 'single_phase',
      };
    case 'signal_isolator':
      return { ioChannels: 2, aiSignalType: '4_20ma', phaseSystem: 'single_phase' };
    case 'optocoupler_module':
      return { ioChannels: 4, phaseSystem: 'single_phase' };
    case 'ups_module':
      return { ratingAmps: 10, phaseSystem: 'single_phase' };
    case 'dc_battery_backup':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'motor_operator_kit':
      return { voltage: 230, phaseSystem: 'single_phase' };
    case 'shunt_trip_coil':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'closing_coil':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'uvr_release':
      return { voltage: 24, phaseSystem: 'single_phase' };
    case 'key_interlock':
      return { phaseSystem: 'single_phase' };
    case 'neutral_link':
      return { phaseSystem: 'single_phase' };
    case 'earth_link':
      return { phaseSystem: 'single_phase' };
    case 'current_transformer':
      return { meterCtPrimary: 100, phaseSystem: 'single_phase' };
    case 'voltage_transformer':
      return { phaseVoltage: 230, voltage: 110, phaseSystem: 'single_phase' };
    case 'din_rail':
      return { phaseSystem: 'single_phase' };
    case 'mounting_plate':
      return { phaseSystem: 'single_phase' };
    case 'cable_duct':
      return { phaseSystem: 'single_phase' };
    case 'busbar_support_insulator':
      return { phaseSystem: 'single_phase' };
    case 'ferrule_cable_markers':
      return { phaseSystem: 'single_phase' };
    case 'control_wiring':
      return { phaseSystem: 'single_phase' };
    case 'power_cables':
      return { phaseSystem: 'single_phase' };
    case 'ms_gi_sheet_enclosure':
      return { phaseSystem: 'single_phase' };
    case 'ip_rated_enclosure':
      return { phaseSystem: 'single_phase' };
    case 'power_quality_analyzer':
      return { meterProtocol: 'modbus_tcp', phaseSystem: 'single_phase' };
    case 'three_phase_source':
      return {
        phaseSystem: 'three_phase',
        lineVoltage: 400,
        phaseVoltage: 400 / Math.sqrt(3),
        voltage: 400,
      };
    case 'three_phase_motor':
      return {
        powerWatts: 3000,
        loadType: 'inductive',
        powerFactor: 0.85,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
        ratedLineAmps: 5.5,
      };
    case 'three_phase_mcb':
    case 'mccb':
      return {
        ratingAmps: 16,
        tripCurve: 'C',
        breakingCapacity: 6000,
        poles: 3,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
      };
    case 'motor_protection_circuit_breaker':
      return {
        ratingAmps: 12,
        breakingCapacity: 6000,
        mpcbTripClass: '10',
        poles: 3,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
      };
    case 'motorized_mccb':
      return {
        ratingAmps: 63,
        tripCurve: 'C',
        breakingCapacity: 10000,
        poles: 3,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
        mccbBmsEnabled: false,
        mccbBmsCtrlVoltageOk: true,
        mccbBmsMotorReady: true,
        mccbBmsProtocol: 'none' as const,
        mccbCtrlSupply: '24dc',
        mccbCtrlFuseDesignation: 'F1',
        mccbCtrlFuseAmps: 2,
        mccbRelayMotorId: 'K1',
        mccbRelayStId: 'K2',
        mccbBmsDoMotorTag: 'DO-MOTOR',
        mccbBmsDoShuntTag: 'DO-ST',
        mccbBmsDiAuxNoTag: 'DI-AUX-NO',
        mccbBmsDiAuxNcTag: 'DI-AUX-NC',
        mccbBmsDiTripTag: 'DI-TRIP',
      };
    case 'four_pole_motorized_mccb':
      return {
        ratingAmps: 63,
        tripCurve: 'C',
        breakingCapacity: 10000,
        poles: 4,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
        mccbBmsEnabled: false,
        mccbBmsCtrlVoltageOk: true,
        mccbBmsMotorReady: true,
        mccbBmsProtocol: 'none' as const,
        mccbCtrlSupply: '24dc',
        mccbCtrlFuseDesignation: 'F1',
        mccbCtrlFuseAmps: 2,
        mccbRelayMotorId: 'K1',
        mccbRelayStId: 'K2',
        mccbBmsDoMotorTag: 'DO-MOTOR',
        mccbBmsDoShuntTag: 'DO-ST',
        mccbBmsDiAuxNoTag: 'DI-AUX-NO',
        mccbBmsDiAuxNcTag: 'DI-AUX-NC',
        mccbBmsDiTripTag: 'DI-TRIP',
      };
    case 'four_phase_mcb':
      return {
        ratingAmps: 16,
        tripCurve: 'C',
        breakingCapacity: 6000,
        poles: 4,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
      };
    case 'air_circuit_breaker':
      return {
        ratingAmps: 630,
        breakingCapacity: 10000,
        poles: 4,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
        acbInstantaneousMult: 10,
        acbShortTimeMult: 6,
        acbEarthFaultEnabled: true,
        acbEarthFaultAmps: 120,
        acbLineFrequencyHz: 50,
        acbShortTimeDelayS: 0.18,
        acbEarthFaultDelayS: 0.1,
        acbThermalTripIntegral: 80,
        acbBmsEnabled: false,
        acbBmsUvrEnergized: true,
        acbBmsSpringCharged: true,
        acbBmsProtocol: 'none' as const,
        acbCtrlSupply: '24dc',
        acbCtrlFuseDesignation: 'F1',
        acbCtrlFuseAmps: 2,
        acbRelayCcId: 'K1',
        acbRelayStId: 'K2',
        acbBmsDoCloseTag: 'DO-CC',
        acbBmsDoOpenTag: 'DO-ST',
        acbBmsDi52aTag: 'DI-52a',
        acbBmsDi52bTag: 'DI-52b',
        acbBmsDiTripTag: 'DI-TRIP',
      };
    case 'three_phase_contactor':
      return {
        ratingAmps: 25,
        poles: 3,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
      };
    case 'four_phase_contactor':
      return {
        ratingAmps: 25,
        poles: 4,
        lineVoltage: 400,
        phaseSystem: 'three_phase',
      };
    case 'switch':
      return { switchType: 'SPST', poles: 1, phaseSystem: 'single_phase' };
    case 'push_button':
      return { buttonType: 'NO', phaseSystem: 'single_phase' };
    case 'mcb':
      return {
        ratingAmps: 16,
        tripCurve: 'C',
        breakingCapacity: 6000,
        poles: 1,
        phaseSystem: 'single_phase',
      };
    case 'hrc_fuse':
      return {
        ratingAmps: 32,
        breakingCapacity: 10000,
        phaseSystem: 'single_phase',
      };
    case 'control_circuit_fuse':
      return {
        ratingAmps: 2,
        breakingCapacity: 6000,
        phaseSystem: 'single_phase',
      };
    case 'earth_leakage_relay_cbct':
      return {
        ratingAmps: 63,
        earthLeakageTripMa: 30,
        phaseSystem: 'single_phase',
      };
    case 'rcd':
    case 'residual_current_circuit_breaker':
      return {
        ratingAmps: 40,
        rcdSensitivity: 30,
        poles: 2,
        phaseSystem: 'single_phase',
      };
    case 'overload_relay':
      return { ratingAmps: 16, phaseSystem: 'single_phase' };
    case 'socket':
      return {
        socketType: 'schuko',
        voltage: 230,
        ratingAmps: 16,
        phaseSystem: 'single_phase',
      };
    case 'lamp':
      return {
        powerWatts: 60,
        loadType: 'resistive',
        powerFactor: 1,
        phaseSystem: 'single_phase',
      };
    case 'motor':
      return {
        powerWatts: 1000,
        loadType: 'inductive',
        powerFactor: 0.8,
        phaseSystem: 'single_phase',
      };
    case 'heater':
      return {
        powerWatts: 2000,
        loadType: 'resistive',
        powerFactor: 1,
        phaseSystem: 'single_phase',
      };
    case 'panel_heater':
      return {
        powerWatts: 100,
        loadType: 'resistive',
        powerFactor: 1,
        phaseSystem: 'single_phase',
      };
    case 'cooling_fan':
      return {
        powerWatts: 40,
        loadType: 'inductive',
        powerFactor: 0.85,
        phaseSystem: 'single_phase',
      };
    case 'generic_load':
      return {
        powerWatts: 100,
        loadType: 'resistive',
        powerFactor: 1,
        phaseSystem: 'single_phase',
      };
    case 'busbar':
    case 'busbar_system':
      return { wireColor: 'brown', phaseSystem: 'single_phase' };
    case 'neutral_bar_system':
      return { wireColor: 'blue', phaseSystem: 'single_phase' };
    case 'earth_bar_grounding_system':
      return { wireColor: 'green_yellow', phaseSystem: 'single_phase' };
    case 'terminal_block':
      return { phaseSystem: 'single_phase' };
    case 'contactor':
    case 'relay':
    case 'smart_relay':
    case 'timer':
      return { ratingAmps: 25, phaseSystem: 'single_phase' };
    case 'estop':
      return { phaseSystem: 'single_phase' };
    case 'door_interlock':
    case 'mechanical_interlock':
      return { phaseSystem: 'single_phase' };
    case 'selector_switch':
      return {
        selectorPosition: 'OFF',
        phaseSystem: 'single_phase',
      };
    case 'indicator_lamp':
      return {
        powerWatts: 1,
        loadType: 'resistive',
        powerFactor: 1,
        indicatorColor: 'red',
        indicatorPhaseTag: 'L',
        phaseSystem: 'single_phase',
      };
    case 'phase_indicator_bank':
      return { lineVoltage: 400, powerWatts: 3, phaseSystem: 'three_phase' };
    case 'smps':
      return {
        voltage: 24,
        phaseSystem: 'single_phase',
        meterProtocol: 'none',
      };
    case 'interposing_relay':
      return {
        ratingAmps: 6,
        relayCoilVoltage: 24,
        relayCoilSupply: '24dc',
        phaseSystem: 'single_phase',
      };
    case 'aux_contact_block':
      return {
        ratingAmps: 10,
        phaseSystem: 'single_phase',
      };
    case 'energy_meter':
    case 'digital_multifunction_meter':
      return {
        lineVoltage: 400,
        ratingAmps: 100,
        meterProtocol: 'modbus_rtu',
        meterCtPrimary: 100,
        meterCommAddress: 1,
        meterShowKwh: true,
        phaseSystem: 'three_phase',
      };
    case 'multimeter':
      return {
        multimeterMode: 'voltage',
        multimeterSignal: 'auto',
        multimeterHighVoltage: true,
        multimeterMaxVoltage: 1000,
        phaseSystem: 'single_phase',
      };
    case 'junction':
      return { phaseSystem: 'single_phase' };
    case 'wire':
      return { phaseSystem: 'single_phase' };
    default:
      return {};
  }
}

function getDefaultLabel(type: ComponentType): string {
  const labels: Record<string, string> = {
    power_source: 'AC Supply',
    dc_power_source: 'DC Supply',
    ac_dc_converter: 'AC/DC',
    control_transformer: 'CTRL XFMR',
    modbus_tcp_gateway: 'MB TCP GW',
    modbus_rtu_module: 'MB RTU',
    bacnet_ip_gateway: 'BACnet GW',
    di_module: 'DI MOD',
    do_module: 'DO MOD',
    ai_module: 'AI MOD',
    ao_module: 'AO MOD',
    relay_interface_card: 'REL IF',
    smart_relay: 'SMART REL',
    communication_converter: 'COMM CVT',
    iot_gateway: 'IOT GW',
    cloud_monitoring_module: 'CLOUD MON',
    energy_management_controller: 'EMC',
    aux_contact_block: 'AUX BLOCK',
    ethernet_switch: 'ETH SW',
    signal_isolator: 'ISOLATOR',
    optocoupler_module: 'OPTO',
    ups_module: 'UPS',
    dc_battery_backup: 'DC BAT',
    motor_operator_kit: 'MOTOR OP',
    shunt_trip_coil: 'ST COIL',
    closing_coil: 'CC COIL',
    uvr_release: 'UVR',
    key_interlock: 'KEY LOCK',
    neutral_link: 'N LINK',
    earth_link: 'PE LINK',
    current_transformer: 'CT',
    voltage_transformer: 'VT',
    din_rail: 'DIN RAIL',
    mounting_plate: 'MOUNT PLATE',
    cable_duct: 'DUCT',
    busbar_support_insulator: 'BUSBAR SUP',
    ferrule_cable_markers: 'FERRULE',
    control_wiring: 'CTRL WIRE',
    power_cables: 'PWR CABLE',
    ms_gi_sheet_enclosure: 'MS/GI ENC',
    ip_rated_enclosure: 'ENCLOSURE',
    power_quality_analyzer: 'PQA',
    switch: 'Switch',
    push_button: 'PB',
    mcb: 'MCB',
    hrc_fuse: 'HRC Fuse',
    control_circuit_fuse: 'CTRL Fuse',
    earth_leakage_relay_cbct: 'ELR+CBCT',
    rcd: 'RCD',
    residual_current_circuit_breaker: 'RCCB',
    overload_relay: 'OLR',
    socket: 'Socket',
    lamp: 'Lamp',
    motor: 'Motor',
    heater: 'Heater',
    panel_heater: 'Panel Heater',
    cooling_fan: 'Cooling Fan',
    generic_load: 'Load',
    busbar: 'Busbar',
    busbar_system: 'Busbar SYS',
    neutral_bar_system: 'NEUTRAL BAR',
    earth_bar_grounding_system: 'EARTH BAR',
    terminal_block: 'TB',
    junction: 'Junction',
    contactor: 'Contactor',
    relay: 'Relay',
    timer: 'Timer',
    three_phase_source: '3φ Supply',
    three_phase_motor: '3φ Motor',
    three_phase_mcb: '3P MCB',
    mccb: 'MCCB',
    motor_protection_circuit_breaker: 'MPCB',
    four_phase_mcb: '4P MCB',
    motorized_mccb: 'mMCCB',
    four_pole_motorized_mccb: '4P mMCCB',
    air_circuit_breaker: 'ACB',
    three_phase_contactor: '3P KM',
    four_phase_contactor: '4P KM',
    estop: 'E-STOP',
    door_interlock: 'Door SW',
    mechanical_interlock: 'MECH INTLK',
    selector_switch: 'AUTO/MAN',
    indicator_lamp: 'HL',
    phase_indicator_bank: 'L1/L2/L3',
    smps: 'SMPS 24V',
    interposing_relay: 'K-IF',
    energy_meter: 'EM',
    digital_multifunction_meter: 'DMFM',
    multimeter: 'DMM',
  };
  return labels[type] || type;
}

function getInitialState(type: ComponentType): CircuitComponent['state'] {
  // Components that represent user-operated switching/protection start open/off.
  const startsOff = new Set<ComponentType>([
    'switch',
    'push_button',
    'mcb',
    'hrc_fuse',
    'control_circuit_fuse',
    'earth_leakage_relay_cbct',
    'rcd',
    'residual_current_circuit_breaker',
    'contactor',
    'relay',
    'smart_relay',
    'timer',
    'overload_relay',
    'three_phase_mcb',
    'mccb',
    'motor_protection_circuit_breaker',
    'four_phase_mcb',
    'motorized_mccb',
    'four_pole_motorized_mccb',
    'air_circuit_breaker',
    'three_phase_contactor',
    'four_phase_contactor',
    'interposing_relay',
    'aux_contact_block',
    'door_interlock',
    'mechanical_interlock',
    'key_interlock',
  ]);

  if (type === 'push_button') return 'off';
  // E-Stop is normally closed (safe state == coil/loop continuous).
  // Selector / indicator / SMPS / energy_meter conduct passively, so 'on'.
  return startsOff.has(type) ? 'off' : 'on';
}

function createEmptyCircuit(): Circuit {
  return {
    id: uuid(),
    name: 'New Circuit',
    components: [],
    wires: [],
    gridSize: 20,
    zoom: 1,
    panX: 0,
    panY: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

interface CircuitStore {
  circuit: Circuit;
  simulationResult: SimulationResult | null;
  selectedId: string | null;
  tool: ToolMode;
  wireInProgress: Partial<Wire> | null;
  wirePoints: number[];
  /** Axis the next leg of the in-progress wire will follow ('h' = horizontal,
   *  'v' = vertical). Seeded from the start terminal's outward direction so
   *  the first segment leaves the terminal perpendicular to the component;
   *  toggles after every committed leg so subsequent clicks alternate. */
  wireOrientation: 'h' | 'v';
  history: HistoryEntry[];
  historyIndex: number;
  faultDialogEvent: FaultEvent | null;

  addComponent: (
    type: ComponentType,
    x: number,
    y: number,
    options?: {
      pushButtonVariant?: 'NO' | 'NC';
      mcbInitialPoles?: 1 | 2;
      initialScale?: number;
    }
  ) => void;
  setMcbPoleLayout: (id: string, poles: 1 | 2) => void;
  setPushButtonPressed: (id: string, pressed: boolean) => void;
  updateComponent: (
    id: string,
    updates: Partial<CircuitComponent>
  ) => void;
  setComponentPhaseSystem: (id: string, phase: PhaseSystem) => void;
  removeComponent: (id: string) => void;
  toggleComponent: (id: string) => void;
  resetTripped: (id: string) => void;
  /** BMS closing coil (CC) pulse — closes main contacts if interlocks OK */
  acbBmsClosePulse: (id: string) => void;
  /** BMS shunt trip — opens main contacts (remote OFF) */
  acbBmsShuntOpen: (id: string) => void;
  mccbBmsMotorClosePulse: (id: string) => void;
  mccbBmsShuntOpen: (id: string) => void;
  moveComponent: (id: string, x: number, y: number) => void;
  rotateComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;

  addWire: (wire: Omit<Wire, 'id'>) => void;
  updateWire: (id: string, updates: Partial<Wire>) => void;
  removeWire: (id: string) => void;
  startWire: (componentId: string, pointId: string) => void;
  addWirePoint: (x: number, y: number) => void;
  finishWire: (componentId: string, pointId: string) => void;
  cancelWire: () => void;

  setSelected: (id: string | null) => void;
  setTool: (tool: ToolMode) => void;
  setZoom: (zoom: number) => void;
  /** Zoom to `zoom` while keeping the world point under (stageX, stageY) fixed; coords match Konva `getPointerPosition()`. */
  setZoomAroundStagePoint: (
    zoom: number,
    stageX: number,
    stageY: number
  ) => void;
  setPan: (x: number, y: number) => void;

  runSimulation: () => void;
  clearCircuit: () => void;
  loadCircuit: (circuit: Circuit) => void;
  saveCircuit: () => void;

  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;

  dismissFault: () => void;
}

export const useCircuitStore = create<CircuitStore>((set, get) => ({
  circuit: createEmptyCircuit(),
  simulationResult: null,
  selectedId: null,
  tool: 'select',
  wireInProgress: null,
  wirePoints: [],
  wireOrientation: 'h',
  history: [],
  historyIndex: -1,
  faultDialogEvent: null,

  addComponent: (type, x, y, options) => {
    const id = uuid();
    const baseProps = getDefaultProperties(type);
    let properties =
      type === 'push_button' && options?.pushButtonVariant === 'NC'
        ? { ...baseProps, buttonType: 'NC' as const }
        : baseProps;
    if (type === 'mcb' && options?.mcbInitialPoles === 2) {
      properties = { ...properties, poles: 2 };
    }
    const mcbPolesForCp =
      type === 'mcb' ? (properties.poles === 2 ? 2 : 1) : undefined;
    const newComp: CircuitComponent = {
      id,
      type,
      label: getDefaultLabel(type),
      x,
      y,
      scale: clampComponentScale(options?.initialScale ?? 1),
      rotation: 0,
      state: getInitialState(type),
      ...(type === 'push_button' ? { pressed: false } : {}),
      selected: false,
      connectionPoints: createConnectionPoints(id, type, {
        mcbPoles: mcbPolesForCp,
      }),
      properties,
    };
    set((state) => ({
      circuit: {
        ...state.circuit,
        components: [...state.circuit.components, newComp],
        updatedAt: new Date().toISOString(),
      },
    }));
    get().pushHistory(`Added ${type}`);
    get().runSimulation();
  },

  setMcbPoleLayout: (id, poles) => {
    const circuit = get().circuit;
    const comp = circuit.components.find((c) => c.id === id);
    if (!comp || comp.type !== 'mcb') return;
    const clamped: 1 | 2 = poles === 2 ? 2 : 1;
    const prevLayout = mcbLayoutPoles(comp);
    if (prevLayout === clamped) {
      if (comp.properties.poles !== clamped) {
        get().updateComponent(id, {
          properties: { ...comp.properties, poles: clamped },
        });
        get().pushHistory(`MCB poles: ${clamped}P`);
      }
      return;
    }
    const newCps = createConnectionPoints(comp.id, 'mcb', {
      mcbPoles: clamped,
    });
    const pairs: [string, string][] =
      prevLayout === 1 && clamped === 2
        ? [
            ['IN', 'IN_L'],
            ['OUT', 'OUT_L'],
          ]
        : [
            ['IN_L', 'IN'],
            ['OUT_L', 'OUT'],
            ['IN_N', 'IN'],
            ['OUT_N', 'OUT'],
          ];
    const remap = buildPointRemapByLabels(comp, newCps, pairs);
    const newWires = remapWireEndpointsForMorph(
      circuit.wires,
      comp.id,
      remap
    );
    const newComp: CircuitComponent = {
      ...comp,
      properties: { ...comp.properties, poles: clamped },
      connectionPoints: newCps,
    };
    const updatedCircuit = syncWireEndpoints({
      ...circuit,
      components: circuit.components.map((c) =>
        c.id === id ? newComp : c
      ),
      wires: newWires,
      updatedAt: new Date().toISOString(),
    });
    set({ circuit: updatedCircuit });
    get().pushHistory(`MCB ${clamped}P layout`);
    get().runSimulation();
  },

  setPushButtonPressed: (id, pressed) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        components: state.circuit.components.map((c) =>
          c.id === id && c.type === 'push_button' ? { ...c, pressed } : c
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().runSimulation();
  },

  updateComponent: (id, updates) => {
    const next: Partial<CircuitComponent> =
      updates.scale !== undefined
        ? { ...updates, scale: clampComponentScale(updates.scale) }
        : updates;
    set((state) => ({
      // Re-snap wire endpoints to terminal world positions in case the update
      // changed something that moves them (e.g. visual scale). syncWireEndpoints
      // is idempotent, so it's safe to call on every property change.
      circuit: syncWireEndpoints({
        ...state.circuit,
        components: state.circuit.components.map((c) =>
          c.id === id ? { ...c, ...next } : c
        ),
        updatedAt: new Date().toISOString(),
      }),
    }));
    get().runSimulation();
  },

  setComponentPhaseSystem: (id, phase) => {
    const circuit = get().circuit;
    const comp = circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const nextType = resolveTypeFromPhasePreference(comp.type, phase);
    if (nextType === comp.type) {
      get().updateComponent(id, {
        properties: { ...comp.properties, phaseSystem: phase },
      });
      get().pushHistory(`Phase system: ${phase}`);
      return;
    }
    const newProps = mergedPropsMorph(comp, nextType);
    const mcbPolesForCp =
      nextType === 'mcb'
        ? newProps.poles === 2
          ? 2
          : 1
        : undefined;
    const newCps = createConnectionPoints(comp.id, nextType, {
      mcbPoles: mcbPolesForCp,
    });
    const pairs = morphLabelPairs(comp, nextType);
    if (!pairs) {
      get().updateComponent(id, {
        properties: { ...comp.properties, phaseSystem: phase },
      });
      get().pushHistory(`Phase system: ${phase}`);
      return;
    }
    const remap = buildPointRemapByLabels(comp, newCps, pairs);
    const newComp: CircuitComponent = {
      id: comp.id,
      type: nextType,
      label: comp.label,
      x: comp.x,
      y: comp.y,
      rotation: comp.rotation,
      state: comp.state,
      selected: comp.selected,
      connectionPoints: newCps,
      properties: newProps,
    };
    const newWires = remapWireEndpointsForMorph(
      circuit.wires,
      comp.id,
      remap
    );
    const updatedCircuit = syncWireEndpoints({
      ...circuit,
      components: circuit.components.map((c) =>
        c.id === id ? newComp : c
      ),
      wires: newWires,
      updatedAt: new Date().toISOString(),
    });
    set({ circuit: updatedCircuit });
    get().pushHistory(`Phase ${phase}: ${comp.type} → ${nextType}`);
    get().runSimulation();
  },

  toggleComponent: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const toggleable = [
      'switch',
      'mcb',
      'hrc_fuse',
      'control_circuit_fuse',
      'earth_leakage_relay_cbct',
      'rcd',
      'residual_current_circuit_breaker',
      'three_phase_mcb',
      'mccb',
      'motor_protection_circuit_breaker',
      'four_phase_mcb',
      'motorized_mccb',
      'four_pole_motorized_mccb',
      'air_circuit_breaker',
      // E-Stop: click latches the mushroom head pressed (loop opens). Reset
      // (twist-to-release) is exposed in the Properties panel for safety, but
      // a direct toggle from the canvas is also allowed for quick simulation.
      'estop',
      'door_interlock',
      'mechanical_interlock',
      'key_interlock',
      'aux_contact_block',
    ];
    if (toggleable.includes(comp.type) && comp.state !== 'tripped') {
      const newState = comp.state === 'on' ? 'off' : 'on';
      get().updateComponent(id, { state: newState });
      get().pushHistory(`Toggled ${comp.label}`);
    }
  },

  resetTripped: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    const nextState =
      comp?.type === 'three_phase_motor' ? 'on' : 'off';
    const updates: Partial<CircuitComponent> = {
      state: nextState,
    };
    if (comp?.type === 'air_circuit_breaker') {
      updates.acbSimState = undefined;
    }
    get().updateComponent(id, updates);
    get().pushHistory('Reset protection / fault');
  },

  acbBmsClosePulse: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp || comp.type !== 'air_circuit_breaker') return;
    const p = comp.properties;
    if (!p.acbBmsEnabled) return;
    if (p.acbBmsUvrEnergized === false) return;
    if (p.acbBmsSpringCharged === false) return;
    if (comp.state === 'tripped' || comp.state === 'fault') return;
    get().updateComponent(id, { state: 'on' });
    get().pushHistory('BMS ACB closing coil (CC pulse)');
  },

  acbBmsShuntOpen: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp || comp.type !== 'air_circuit_breaker') return;
    if (!comp.properties.acbBmsEnabled) return;
    if (comp.state !== 'on') return;
    get().updateComponent(id, { state: 'off' });
    get().pushHistory('BMS ACB shunt trip (remote open)');
  },

  mccbBmsMotorClosePulse: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (
      !comp ||
      (comp.type !== 'motorized_mccb' &&
        comp.type !== 'four_pole_motorized_mccb')
    ) {
      return;
    }
    const p = comp.properties;
    if (!p.mccbBmsEnabled) return;
    if (p.mccbBmsCtrlVoltageOk === false) return;
    if (p.mccbBmsMotorReady === false) return;
    if (comp.state === 'tripped' || comp.state === 'fault') return;
    get().updateComponent(id, { state: 'on' });
    get().pushHistory('BMS mMCCB motor close (remote ON)');
  },

  mccbBmsShuntOpen: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (
      !comp ||
      (comp.type !== 'motorized_mccb' &&
        comp.type !== 'four_pole_motorized_mccb')
    ) {
      return;
    }
    if (!comp.properties.mccbBmsEnabled) return;
    if (comp.state !== 'on') return;
    get().updateComponent(id, { state: 'off' });
    get().pushHistory('BMS mMCCB shunt trip (remote OFF)');
  },

  removeComponent: (id) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        components: state.circuit.components.filter((c) => c.id !== id),
        wires: state.circuit.wires.filter(
          (w) =>
            w.fromComponentId !== id && w.toComponentId !== id
        ),
        updatedAt: new Date().toISOString(),
      },
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
    get().pushHistory('Removed component');
    get().runSimulation();
  },

  moveComponent: (id, x, y) => {
    const gridSize = get().circuit.gridSize;
    const snappedX = Math.round(x / gridSize) * gridSize;
    const snappedY = Math.round(y / gridSize) * gridSize;
    const circuit = get().circuit;
    const prev = circuit.components.find((c) => c.id === id);
    if (!prev) return;
    const dx = snappedX - prev.x;
    const dy = snappedY - prev.y;

    let wires = circuit.wires;
    if (dx !== 0 || dy !== 0) {
      wires = circuit.wires.map((w) => {
        const touches =
          w.fromComponentId === id || w.toComponentId === id;
        if (!touches || w.points.length <= 4) return w;
        const pts = [...w.points];
        for (let i = 2; i < pts.length - 2; i += 2) {
          pts[i] += dx;
          pts[i + 1] += dy;
        }
        return { ...w, points: pts };
      });
    }

    set({
      circuit: syncWireEndpoints({
        ...circuit,
        components: circuit.components.map((c) =>
          c.id === id ? { ...c, x: snappedX, y: snappedY } : c
        ),
        wires,
      }),
    });
  },

  rotateComponent: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const nextRot = (comp.rotation + 90) % 360;
    set((state) => ({
      circuit: syncWireEndpoints({
        ...state.circuit,
        components: state.circuit.components.map((c) =>
          c.id === id ? { ...c, rotation: nextRot } : c
        ),
        updatedAt: new Date().toISOString(),
      }),
    }));
    get().pushHistory(`Rotated ${comp.label}`);
    get().runSimulation();
  },

  duplicateComponent: (id) => {
    const comp = get().circuit.components.find((c) => c.id === id);
    if (!comp) return;
    const baseScale = { initialScale: comp.scale ?? 1 };
    get().addComponent(
      comp.type,
      comp.x + 60,
      comp.y + 60,
      comp.type === 'push_button'
        ? {
            pushButtonVariant:
              comp.properties.buttonType === 'NC' ? 'NC' : 'NO',
            ...baseScale,
          }
        : comp.type === 'mcb'
          ? {
              mcbInitialPoles: mcbLayoutPoles(comp),
              ...baseScale,
            }
          : baseScale
    );
  },

  addWire: (wire) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        wires: [...state.circuit.wires, { ...wire, id: uuid() }],
        updatedAt: new Date().toISOString(),
      },
    }));
    get().pushHistory('Added wire');
    get().runSimulation();
  },

  updateWire: (id, updates) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        wires: state.circuit.wires.map((w) =>
          w.id === id ? { ...w, ...updates } : w
        ),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().pushHistory('Updated wire');
    get().runSimulation();
  },

  removeWire: (id) => {
    set((state) => ({
      circuit: {
        ...state.circuit,
        wires: state.circuit.wires.filter((w) => w.id !== id),
        updatedAt: new Date().toISOString(),
      },
    }));
    get().pushHistory('Removed wire');
    get().runSimulation();
  },

  startWire: (componentId, pointId) => {
    const comp = get().circuit.components.find(
      (c) => c.id === componentId
    );
    if (!comp) return;
    const point = comp.connectionPoints.find((p) => p.id === pointId);
    if (!point) return;
    const { x: absX, y: absY } = connectionPointWorld(comp, point);
    set({
      wireInProgress: {
        fromComponentId: componentId,
        fromPointId: pointId,
        color: inferWireColorFromSingleTerminal(point.label),
        crossSection: 2.5,
        energized: false,
        currentAmps: 0,
      },
      wirePoints: [absX, absY],
      wireOrientation: terminalOutwardOrientation(comp, point),
    });
  },

  addWirePoint: (x, y) => {
    set((state) => {
      const pts = state.wirePoints;
      if (pts.length < 2) {
        return { wirePoints: [...pts, x, y] };
      }
      const lastX = pts[pts.length - 2];
      const lastY = pts[pts.length - 1];
      const orientation = state.wireOrientation;
      // Each click commits a single turning point at the cursor along the
      // current orientation axis. The free coordinate follows the cursor
      // exactly (no grid snap, so the wire can stay aligned with off-grid
      // terminals); the constrained coordinate is locked to the previous
      // vertex so the segment between them is purely horizontal or vertical.
      const newX = orientation === 'h' ? x : lastX;
      const newY = orientation === 'h' ? lastY : y;
      if (newX === lastX && newY === lastY) {
        return state;
      }
      return {
        wirePoints: [...pts, newX, newY],
        wireOrientation: orientation === 'h' ? 'v' : 'h',
      };
    });
  },

  finishWire: (componentId, pointId) => {
    const wip = get().wireInProgress;
    if (!wip || !wip.fromComponentId || !wip.fromPointId) return;
    if (wip.fromComponentId === componentId) return;

    const comp = get().circuit.components.find(
      (c) => c.id === componentId
    );
    if (!comp) return;
    const point = comp.connectionPoints.find((p) => p.id === pointId);
    if (!point) return;
    const fromComp = get().circuit.components.find(
      (c) => c.id === wip.fromComponentId
    );
    const fromPoint = fromComp?.connectionPoints.find(
      (p) => p.id === wip.fromPointId
    );

    const { x: absX, y: absY } = connectionPointWorld(comp, point);
    const pts = get().wirePoints;
    let allPoints: number[];
    if (pts.length >= 2) {
      const lastX = pts[pts.length - 2];
      const lastY = pts[pts.length - 1];
      // The destination terminal's outward axis dictates the *last* leg, so
      // the wire enters perpendicular to the component edge. Pick the corner
      // that produces that final orientation regardless of the running axis.
      const targetOrientation = terminalOutwardOrientation(comp, point);
      const firstAxis: 'h' | 'v' =
        targetOrientation === 'h' ? 'v' : 'h';
      const tail = orthogonalLeg(lastX, lastY, absX, absY, firstAxis);
      allPoints = [...pts, ...tail];
    } else {
      allPoints = [...pts, absX, absY];
    }

    get().addWire({
      fromComponentId: wip.fromComponentId,
      fromPointId: wip.fromPointId,
      toComponentId: componentId,
      toPointId: pointId,
      points: allPoints,
      color: inferWireColor(fromPoint?.label || '', point.label),
      crossSection: wip.crossSection || 2.5,
      energized: false,
      currentAmps: 0,
    });

    set({ wireInProgress: null, wirePoints: [], wireOrientation: 'h' });
  },

  cancelWire: () => {
    set({ wireInProgress: null, wirePoints: [], wireOrientation: 'h' });
  },

  setSelected: (id) => set({ selectedId: id }),
  setTool: (tool) => {
    set({ tool });
    if (tool !== 'wire') {
      get().cancelWire();
    }
  },
  setZoom: (zoom) =>
    set((state) => ({
      circuit: {
        ...state.circuit,
        zoom: Math.max(0.1, Math.min(5, zoom)),
      },
    })),
  setZoomAroundStagePoint: (zoom, stageX, stageY) =>
    set((state) => {
      const prevZ = state.circuit.zoom;
      const z = Math.max(0.1, Math.min(5, zoom));
      if (Math.abs(z - prevZ) < 1e-12) {
        return state;
      }
      const ratio = z / prevZ;
      const panX = stageX - (stageX - state.circuit.panX) * ratio;
      const panY = stageY - (stageY - state.circuit.panY) * ratio;
      return {
        circuit: {
          ...state.circuit,
          zoom: z,
          panX,
          panY,
        },
      };
    }),
  setPan: (x, y) =>
    set((state) => ({
      circuit: { ...state.circuit, panX: x, panY: y },
    })),

  runSimulation: () => {
    const base = get().circuit;
    const normalized = {
      ...base,
      components: base.components.map(ensureBreakerControlTerminals),
    };
    const clonedCircuit = structuredClone(normalized);
    const result = engine.simulate(clonedCircuit, 0, Date.now());
    set({
      circuit: clonedCircuit,
      simulationResult: result,
      faultDialogEvent:
        result.faults.length > 0 ? result.faults[0] : null,
    });
  },

  clearCircuit: () => {
    set({
      circuit: createEmptyCircuit(),
      simulationResult: null,
      selectedId: null,
      history: [],
      historyIndex: -1,
    });
  },

  loadCircuit: (circuit) => {
    let wires = circuit.wires;
    const withPush = circuit.components.map((c) =>
      c.type === 'push_button' && !('pressed' in c)
        ? { ...c, pressed: false }
        : c
    );
    const components = withPush.map((c) => {
      if (c.type !== 'mcb') return c;
      if ((c.properties.poles ?? 1) !== 2) return c;
      if (c.connectionPoints.some((p) => labelNorm(p.label) === 'IN_L')) {
        return c;
      }
      const newCps = createConnectionPoints(c.id, 'mcb', { mcbPoles: 2 });
      const remap = buildPointRemapByLabels(c, newCps, [
        ['IN', 'IN_L'],
        ['OUT', 'OUT_L'],
      ]);
      wires = remapWireEndpointsForMorph(wires, c.id, remap);
      return { ...c, connectionPoints: newCps };
    });
    const withAcbCps = components.map((c) =>
      ensureBreakerControlTerminals(c)
    );
    const normalized: Circuit = {
      ...circuit,
      components: withAcbCps,
      wires,
    };
    set({ circuit: normalized, selectedId: null });
    get().runSimulation();
  },

  saveCircuit: () => {
    const data = {
      version: '1.0',
      name: get().circuit.name,
      created: get().circuit.createdAt,
      circuit: {
        components: get().circuit.components,
        wires: get().circuit.wires,
      },
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${get().circuit.name}.esim`;
    a.click();
    URL.revokeObjectURL(url);
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({
      circuit: JSON.parse(
        JSON.stringify(history[newIndex].circuit)
      ),
      historyIndex: newIndex,
    });
    get().runSimulation();
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    set({
      circuit: JSON.parse(
        JSON.stringify(history[newIndex].circuit)
      ),
      historyIndex: newIndex,
    });
    get().runSimulation();
  },

  pushHistory: (description) => {
    const circuit = JSON.parse(JSON.stringify(get().circuit));
    set((state) => {
      const trimmed = state.history.slice(
        0,
        state.historyIndex + 1
      );
      const newHistory = [
        ...trimmed,
        { circuit, description },
      ].slice(-50);
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  dismissFault: () => set({ faultDialogEvent: null }),
}));
