import { v4 as uuid } from 'uuid';
import type {
  Circuit,
  CircuitComponent,
  Wire,
  ConnectionPoint,
  ComponentType,
} from '../types';
import { connectionPointWorld } from '../utils/geometry';
import { inferWireColor } from '../utils/inferWireColor';

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

export type CreateConnectionPointsOptions = {
  /** Single-phase MCB: 1 pole (1/2) or 2 pole (1–2 line, 3–4 neutral). */
  mcbPoles?: 1 | 2;
  /** RCD / RCCB: 2P (1–4) or 4P (1–8). */
  rcdPoles?: 2 | 4;
  /** Busbar taps split around center (left + right). */
  busbarLeftCount?: number;
  busbarRightCount?: number;
};

function createMcbConnectionPoints(
  componentId: string,
  poles: 1 | 2
): ConnectionPoint[] {
  if (poles === 2) {
    return [
      { id: uuid(), componentId, x: -10, y: -25, label: '1' },
      { id: uuid(), componentId, x: -10, y: 25, label: '2' },
      { id: uuid(), componentId, x: 10, y: -25, label: '3' },
      { id: uuid(), componentId, x: 10, y: 25, label: '4' },
    ];
  }
  return [
    { id: uuid(), componentId, x: 0, y: -25, label: '1' },
    { id: uuid(), componentId, x: 0, y: 25, label: '2' },
  ];
}

function createBusbarConnectionPoints(
  componentId: string,
  leftCount: number,
  rightCount: number
): ConnectionPoint[] {
  const l = Math.max(1, Math.min(40, Math.floor(leftCount)));
  const r = Math.max(1, Math.min(40, Math.floor(rightCount)));
  const pitch = 20;
  const left = Array.from({ length: l }, (_, i) => ({
    id: uuid(),
    componentId,
    x: -(i + 0.5) * pitch,
    y: 0,
    label: `TAP_L${i + 1}`,
  }));
  const right = Array.from({ length: r }, (_, i) => ({
    id: uuid(),
    componentId,
    x: (i + 0.5) * pitch,
    y: 0,
    label: `TAP_R${i + 1}`,
  }));
  return [...left.reverse(), ...right];
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
  const x = -56;
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

function acbPowerConnectionPoints(componentId: string): ConnectionPoint[] {
  // Match the visual lead tips in AirCircuitBreakerSymbol
  // (top at -36, bottom at +42) so orthogonal docking feels correct.
  const xs = [-30, -10, 10, 30];
  return [
    { id: uuid(), componentId, x: xs[0], y: -36, label: '1' },
    { id: uuid(), componentId, x: xs[0], y: 42, label: '2' },
    { id: uuid(), componentId, x: xs[1], y: -36, label: '3' },
    { id: uuid(), componentId, x: xs[1], y: 42, label: '4' },
    { id: uuid(), componentId, x: xs[2], y: -36, label: '5' },
    { id: uuid(), componentId, x: xs[2], y: 42, label: '6' },
    { id: uuid(), componentId, x: xs[3], y: -36, label: '7' },
    { id: uuid(), componentId, x: xs[3], y: 42, label: '8' },
  ];
}

function ensureAcbControlConnectionPoints(
  component: CircuitComponent
): CircuitComponent {
  if (component.type !== 'air_circuit_breaker') return component;
  const desired = [
    ...acbPowerConnectionPoints(component.id),
    ...acbControlConnectionPoints(component.id),
  ];
  const existingByLabel = new Map(
    component.connectionPoints.map((cp) => [cp.label, cp] as const)
  );
  const normalized = desired.map((cp) => {
    const old = existingByLabel.get(cp.label);
    return old
      ? { ...old, x: cp.x, y: cp.y }
      : { ...cp, id: uuid(), componentId: component.id };
  });
  const unchanged =
    normalized.length === component.connectionPoints.length &&
    normalized.every((cp, i) => {
      const old = component.connectionPoints[i];
      return (
        old &&
        old.id === cp.id &&
        old.label === cp.label &&
        old.x === cp.x &&
        old.y === cp.y
      );
    });
  if (unchanged) return component;
  return {
    ...component,
    connectionPoints: normalized,
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

/** Power poles — same dock geometry as `acbPowerConnectionPoints` (ACB-style frame). */
function motorizedMccbPowerConnectionPoints(
  componentId: string,
  fourP: boolean
): ConnectionPoint[] {
  const yTop = -36;
  const yBottom = 42;
  if (fourP) {
    return [
      { id: uuid(), componentId, x: -30, y: yTop, label: '1' },
      { id: uuid(), componentId, x: -30, y: yBottom, label: '2' },
      { id: uuid(), componentId, x: -10, y: yTop, label: '3' },
      { id: uuid(), componentId, x: -10, y: yBottom, label: '4' },
      { id: uuid(), componentId, x: 10, y: yTop, label: '5' },
      { id: uuid(), componentId, x: 10, y: yBottom, label: '6' },
      { id: uuid(), componentId, x: 30, y: yTop, label: '7' },
      { id: uuid(), componentId, x: 30, y: yBottom, label: '8' },
    ];
  }
  return [
    { id: uuid(), componentId, x: -20, y: yTop, label: '1' },
    { id: uuid(), componentId, x: -20, y: yBottom, label: '2' },
    { id: uuid(), componentId, x: 0, y: yTop, label: '3' },
    { id: uuid(), componentId, x: 0, y: yBottom, label: '4' },
    { id: uuid(), componentId, x: 20, y: yTop, label: '5' },
    { id: uuid(), componentId, x: 20, y: yBottom, label: '6' },
  ];
}

function ensureMotorizedMccbConnectionPoints(
  component: CircuitComponent
): CircuitComponent {
  if (
    component.type !== 'motorized_mccb' &&
    component.type !== 'four_pole_motorized_mccb'
  ) {
    return component;
  }
  const fourP = component.type === 'four_pole_motorized_mccb';
  const desired = [
    ...motorizedMccbPowerConnectionPoints(component.id, fourP),
    ...mccbControlConnectionPoints(component.id),
  ];
  const existingByLabel = new Map(
    component.connectionPoints.map((cp) => [cp.label, cp] as const)
  );
  const normalized = desired.map((cp) => {
    const old = existingByLabel.get(cp.label);
    return old
      ? { ...old, x: cp.x, y: cp.y }
      : { ...cp, id: uuid(), componentId: component.id };
  });
  const unchanged =
    normalized.length === component.connectionPoints.length &&
    normalized.every((cp, i) => {
      const old = component.connectionPoints[i];
      return (
        old &&
        old.id === cp.id &&
        old.label === cp.label &&
        old.x === cp.x &&
        old.y === cp.y
      );
    });
  if (unchanged) return component;
  return {
    ...component,
    connectionPoints: normalized,
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
    ensureMotorizedMccbConnectionPoints(
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
        { id: uuid(), componentId, x: -22, y: -26, label: 'AC_L' },
        { id: uuid(), componentId, x: 22, y: -26, label: 'AC_N' },
        { id: uuid(), componentId, x: -22, y: 26, label: 'DC_PLUS' },
        { id: uuid(), componentId, x: 22, y: 26, label: 'DC_MINUS' },
      ];
    case 'control_transformer':
      return [
        { id: uuid(), componentId, x: -18, y: -22, label: 'PRI_L' },
        { id: uuid(), componentId, x: 18, y: -22, label: 'PRI_N' },
        { id: uuid(), componentId, x: -18, y: 22, label: 'SEC_L' },
        { id: uuid(), componentId, x: 18, y: 22, label: 'SEC_N' },
      ];
    case 'modbus_tcp_gateway':
      return [
        // Power (typical 24VDC gateway supply)
        { id: uuid(), componentId, x: -14, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 14, y: -24, label: 'PWR_0V' },
        // Ethernet side (Modbus TCP / port 502)
        { id: uuid(), componentId, x: 0, y: -30, label: 'ETH0_RJ45' },
        // RS-485 side (Modbus RTU bus)
        { id: uuid(), componentId, x: 30, y: -10, label: 'RS485_A' },
        { id: uuid(), componentId, x: 30, y: 0, label: 'RS485_B' },
        { id: uuid(), componentId, x: 30, y: 10, label: 'RS485_GND' },
        // Shield / frame ground
        { id: uuid(), componentId, x: -30, y: 0, label: 'SHIELD_FG' },
      ];
    case 'bacnet_ip_gateway':
      return [
        // Power + BACnet/IP Ethernet
        { id: uuid(), componentId, x: -14, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 14, y: -24, label: 'PWR_0V' },
        { id: uuid(), componentId, x: 0, y: -30, label: 'ETH0_RJ45' },
        // RS-485 side (BACnet MS/TP or Modbus RTU field bus)
        { id: uuid(), componentId, x: 30, y: -10, label: 'MSTP_A' },
        { id: uuid(), componentId, x: 30, y: 0, label: 'MSTP_B' },
        { id: uuid(), componentId, x: 30, y: 10, label: 'MSTP_GND' },
        // Shield / frame ground
        { id: uuid(), componentId, x: -30, y: 0, label: 'SHIELD_FG' },
      ];
    case 'communication_converter':
      return [
        // TOP = power + ethernet
        { id: uuid(), componentId, x: -18, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 0, y: -24, label: 'PWR_0V' },
        { id: uuid(), componentId, x: 18, y: -24, label: 'ETH0_RJ45' },
        // RIGHT = RS-485
        { id: uuid(), componentId, x: 30, y: -10, label: 'RS485_A' },
        { id: uuid(), componentId, x: 30, y: 0, label: 'RS485_B' },
        { id: uuid(), componentId, x: 30, y: 10, label: 'RS485_GND' },
        // LEFT = RS-232 + shield
        { id: uuid(), componentId, x: -30, y: -12, label: 'RS232_TX' },
        { id: uuid(), componentId, x: -30, y: -2, label: 'RS232_RX' },
        { id: uuid(), componentId, x: -30, y: 8, label: 'RS232_GND' },
        { id: uuid(), componentId, x: -30, y: 18, label: 'SHIELD_FG' },
      ];
    case 'modbus_rtu_module':
      return [
        // TOP = 1,2,3
        { id: uuid(), componentId, x: -18, y: -24, label: 'PWR_L' },
        { id: uuid(), componentId, x: 0, y: -24, label: 'PWR_N' },
        { id: uuid(), componentId, x: 18, y: -24, label: 'PWR_PE' },

        // BOTTOM = 4,5,6
        { id: uuid(), componentId, x: -18, y: 24, label: 'RS485_A' },
        { id: uuid(), componentId, x: 0, y: 24, label: 'RS485_B' },
        { id: uuid(), componentId, x: 18, y: 24, label: 'RS485_GND' },

        // LEFT = 7,8,9,10,11
        { id: uuid(), componentId, x: -30, y: -18, label: 'SHIELD_FG' },
        { id: uuid(), componentId, x: -30, y: -9, label: 'AO+' },
        { id: uuid(), componentId, x: -30, y: 0, label: 'AO-' },
        { id: uuid(), componentId, x: -30, y: 9, label: 'DO_COM' },
        { id: uuid(), componentId, x: -30, y: 18, label: 'DO_NO' },

        // RIGHT = 12,13,14,15,16
        { id: uuid(), componentId, x: 30, y: -18, label: 'DI1' },
        { id: uuid(), componentId, x: 30, y: -9, label: 'DI2' },
        { id: uuid(), componentId, x: 30, y: 0, label: 'AI+' },
        { id: uuid(), componentId, x: 30, y: 9, label: 'AI-' },
        { id: uuid(), componentId, x: 30, y: 18, label: 'DO_NC' },
      ];
    case 'di_module':
      return [
        { id: uuid(), componentId, x: -22, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 22, y: -24, label: 'PWR_0V' },
        { id: uuid(), componentId, x: -30, y: -12, label: 'DI_COM' },
        { id: uuid(), componentId, x: -30, y: -4, label: 'DI_1' },
        { id: uuid(), componentId, x: -30, y: 4, label: 'DI_2' },
        { id: uuid(), componentId, x: -30, y: 12, label: 'DI_3' },
        { id: uuid(), componentId, x: 30, y: -12, label: 'DI_4' },
        { id: uuid(), componentId, x: 30, y: -4, label: 'DI_5' },
        { id: uuid(), componentId, x: 30, y: 4, label: 'DI_6' },
        { id: uuid(), componentId, x: 30, y: 12, label: 'DI_7' },
        { id: uuid(), componentId, x: 0, y: 24, label: 'DI_8' },
      ];
    case 'do_module':
      return [
        { id: uuid(), componentId, x: -22, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 22, y: -24, label: 'PWR_0V' },
        { id: uuid(), componentId, x: -30, y: -12, label: 'DO_COM' },
        { id: uuid(), componentId, x: -30, y: -4, label: 'DO_1' },
        { id: uuid(), componentId, x: -30, y: 4, label: 'DO_2' },
        { id: uuid(), componentId, x: -30, y: 12, label: 'DO_3' },
        { id: uuid(), componentId, x: 30, y: -12, label: 'DO_4' },
        { id: uuid(), componentId, x: 30, y: -4, label: 'DO_5' },
        { id: uuid(), componentId, x: 30, y: 4, label: 'DO_6' },
        { id: uuid(), componentId, x: 30, y: 12, label: 'DO_7' },
        { id: uuid(), componentId, x: 0, y: 24, label: 'DO_8' },
      ];
    case 'ai_module':
      return [
        { id: uuid(), componentId, x: -22, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 22, y: -24, label: 'PWR_0V' },
        { id: uuid(), componentId, x: -30, y: -8, label: 'AI_COM' },
        { id: uuid(), componentId, x: -30, y: 0, label: 'AI_1' },
        { id: uuid(), componentId, x: -30, y: 8, label: 'AI_2' },
        { id: uuid(), componentId, x: 30, y: -8, label: 'AI_3' },
        { id: uuid(), componentId, x: 30, y: 0, label: 'AI_4' },
        { id: uuid(), componentId, x: 30, y: 8, label: 'SHIELD_FG' },
      ];
    case 'ao_module':
      return [
        { id: uuid(), componentId, x: -22, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 22, y: -24, label: 'PWR_0V' },
        { id: uuid(), componentId, x: -30, y: -8, label: 'AO_COM' },
        { id: uuid(), componentId, x: -30, y: 0, label: 'AO_1' },
        { id: uuid(), componentId, x: -30, y: 8, label: 'AO_2' },
        { id: uuid(), componentId, x: 30, y: -8, label: 'AO_3' },
        { id: uuid(), componentId, x: 30, y: 0, label: 'AO_4' },
        { id: uuid(), componentId, x: 30, y: 8, label: 'SHIELD_FG' },
      ];
    case 'relay_interface_card':
      return [
        { id: uuid(), componentId, x: -18, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 0, y: -24, label: 'PWR_0V' },
        { id: uuid(), componentId, x: 18, y: -24, label: 'ETH0_RJ45' },
        { id: uuid(), componentId, x: -30, y: -14, label: 'DO_1' },
        { id: uuid(), componentId, x: -30, y: -6, label: 'DO_2' },
        { id: uuid(), componentId, x: -30, y: 2, label: 'DO_3' },
        { id: uuid(), componentId, x: -30, y: 10, label: 'DO_4' },
        { id: uuid(), componentId, x: 30, y: -14, label: 'DO_5' },
        { id: uuid(), componentId, x: 30, y: -6, label: 'DO_6' },
        { id: uuid(), componentId, x: 30, y: 2, label: 'DO_7' },
        { id: uuid(), componentId, x: 30, y: 10, label: 'DO_8' },
      ];
    case 'iot_gateway':
      return [
        { id: uuid(), componentId, x: -18, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 0, y: -24, label: 'PWR_0V' },
        { id: uuid(), componentId, x: 18, y: -24, label: 'ETH0_RJ45' },
        { id: uuid(), componentId, x: -30, y: -10, label: 'RS485_A' },
        { id: uuid(), componentId, x: -30, y: 0, label: 'RS485_B' },
        { id: uuid(), componentId, x: -30, y: 10, label: 'RS485_GND' },
        { id: uuid(), componentId, x: 30, y: -8, label: 'DI_1' },
        { id: uuid(), componentId, x: 30, y: 0, label: 'DO_1' },
        { id: uuid(), componentId, x: 30, y: 8, label: 'SHIELD_FG' },
      ];
    case 'cloud_monitoring_module':
      return [
        { id: uuid(), componentId, x: -18, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 0, y: -24, label: 'PWR_0V' },
        { id: uuid(), componentId, x: 18, y: -24, label: 'ETH0_RJ45' },
        { id: uuid(), componentId, x: -30, y: -8, label: 'ETH1_RJ45' },
        { id: uuid(), componentId, x: -30, y: 0, label: 'SHIELD_FG' },
        { id: uuid(), componentId, x: 30, y: -8, label: 'DI_1' },
        { id: uuid(), componentId, x: 30, y: 0, label: 'DI_2' },
        { id: uuid(), componentId, x: 30, y: 8, label: 'DO_1' },
      ];
    case 'energy_management_controller':
      return [
        { id: uuid(), componentId, x: -18, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 0, y: -24, label: 'PWR_0V' },
        { id: uuid(), componentId, x: 18, y: -24, label: 'ETH0_RJ45' },
        { id: uuid(), componentId, x: -30, y: -14, label: 'RS485_A' },
        { id: uuid(), componentId, x: -30, y: -6, label: 'RS485_B' },
        { id: uuid(), componentId, x: -30, y: 2, label: 'RS485_GND' },
        { id: uuid(), componentId, x: 30, y: -14, label: 'DI_1' },
        { id: uuid(), componentId, x: 30, y: -6, label: 'DI_2' },
        { id: uuid(), componentId, x: 30, y: 2, label: 'DO_1' },
        { id: uuid(), componentId, x: 30, y: 10, label: 'DO_2' },
      ];
    case 'ethernet_switch':
      return [
        { id: uuid(), componentId, x: -22, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 22, y: -24, label: 'PWR_0V' },
        { id: uuid(), componentId, x: -30, y: -12, label: 'ETH1_RJ45' },
        { id: uuid(), componentId, x: -30, y: -4, label: 'ETH2_RJ45' },
        { id: uuid(), componentId, x: -30, y: 4, label: 'ETH3_RJ45' },
        { id: uuid(), componentId, x: 30, y: -12, label: 'ETH4_RJ45' },
        { id: uuid(), componentId, x: 30, y: -4, label: 'ETH5_RJ45' },
        { id: uuid(), componentId, x: 0, y: 24, label: 'SHIELD_FG' },
      ];
    case 'signal_isolator':
      return [
        { id: uuid(), componentId, x: -30, y: -10, label: 'ANALOG_IN_POS' },
        { id: uuid(), componentId, x: -30, y: 2, label: 'ANALOG_IN_NEG' },
        { id: uuid(), componentId, x: -12, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 12, y: -24, label: 'PWR_0V' },
        { id: uuid(), componentId, x: 30, y: -10, label: 'ANALOG_OUT_POS' },
        { id: uuid(), componentId, x: 30, y: 2, label: 'ANALOG_OUT_NEG' },
      ];
    case 'optocoupler_module':
      return [
        { id: uuid(), componentId, x: -30, y: -10, label: 'IN_CH1_POS' },
        { id: uuid(), componentId, x: -30, y: 2, label: 'IN_CH1_NEG' },
        { id: uuid(), componentId, x: -12, y: -24, label: 'PWR_24V' },
        { id: uuid(), componentId, x: 12, y: -24, label: 'PWR_0V' },
        { id: uuid(), componentId, x: 30, y: -10, label: 'DRY_OUT_CH1_POS' },
        { id: uuid(), componentId, x: 30, y: 2, label: 'DRY_OUT_CH1_NEG' },
      ];
    case 'din_rail':
    case 'mounting_plate':
    case 'cable_duct':
    case 'busbar_support_insulator':
    case 'ferrule_cable_markers':
    case 'ms_gi_sheet_enclosure':
    case 'ip_rated_enclosure':
      return [
        { id: uuid(), componentId, x: -12, y: -22, label: 'ANCHOR_A' },
        { id: uuid(), componentId, x: 12, y: -22, label: 'ANCHOR_B' },
      ];
    case 'ups_module':
      return [
        { id: uuid(), componentId, x: -30, y: -12, label: 'AC_IN_L' },
        { id: uuid(), componentId, x: -30, y: -2, label: 'AC_IN_N' },
        { id: uuid(), componentId, x: 30, y: -12, label: 'AC_OUT_L' },
        { id: uuid(), componentId, x: 30, y: -2, label: 'AC_OUT_N' },
        { id: uuid(), componentId, x: -10, y: 24, label: 'BAT_POS' },
        { id: uuid(), componentId, x: 10, y: 24, label: 'BAT_NEG' },
      ];
    case 'dc_battery_backup':
      return [
        { id: uuid(), componentId, x: -14, y: -22, label: 'BAT_POS' },
        { id: uuid(), componentId, x: 14, y: -22, label: 'BAT_NEG' },
      ];
    case 'motor_operator_kit':
      return [
        { id: uuid(), componentId, x: -20, y: -22, label: 'CTRL_L' },
        { id: uuid(), componentId, x: 0, y: -22, label: 'CTRL_N' },
        { id: uuid(), componentId, x: 20, y: -22, label: 'MOTOR_OUT' },
      ];
    case 'key_interlock':
      return [
        { id: uuid(), componentId, x: -12, y: -22, label: '1' },
        { id: uuid(), componentId, x: 12, y: -22, label: '2' },
      ];
    case 'neutral_link':
      return [
        { id: uuid(), componentId, x: -12, y: -22, label: 'N_IN' },
        { id: uuid(), componentId, x: 12, y: -22, label: 'N_OUT' },
      ];
    case 'earth_link':
      return [
        { id: uuid(), componentId, x: -12, y: -22, label: 'PE_IN' },
        { id: uuid(), componentId, x: 12, y: -22, label: 'PE_OUT' },
      ];
    case 'control_wiring':
      return [
        { id: uuid(), componentId, x: -12, y: -22, label: 'CTRL_FROM' },
        { id: uuid(), componentId, x: 12, y: -22, label: 'CTRL_TO' },
      ];
    case 'power_cables':
      return [
        { id: uuid(), componentId, x: -12, y: -22, label: 'PWR_FROM' },
        { id: uuid(), componentId, x: 12, y: -22, label: 'PWR_TO' },
      ];
    case 'shunt_trip_coil':
    case 'closing_coil':
    case 'uvr_release':
      return [
        { id: uuid(), componentId, x: -14, y: -22, label: 'A1' },
        { id: uuid(), componentId, x: 14, y: -22, label: 'A2' },
      ];
    case 'current_transformer':
      return [
        { id: uuid(), componentId, x: -30, y: -10, label: 'PRI_P1' },
        { id: uuid(), componentId, x: -30, y: 2, label: 'PRI_P2' },
        { id: uuid(), componentId, x: 30, y: -10, label: 'SEC_S1' },
        { id: uuid(), componentId, x: 30, y: 2, label: 'SEC_S2' },
      ];
    case 'voltage_transformer':
      return [
        { id: uuid(), componentId, x: -30, y: -10, label: 'PRI_L' },
        { id: uuid(), componentId, x: -30, y: 2, label: 'PRI_N' },
        { id: uuid(), componentId, x: 30, y: -10, label: 'SEC_L' },
        { id: uuid(), componentId, x: 30, y: 2, label: 'SEC_N' },
      ];
    case 'power_quality_analyzer':
      return [
        { id: uuid(), componentId, x: -30, y: -12, label: '1' },
        { id: uuid(), componentId, x: -30, y: -4, label: '3' },
        { id: uuid(), componentId, x: -30, y: 4, label: '5' },
        { id: uuid(), componentId, x: -30, y: 12, label: '7' },
        { id: uuid(), componentId, x: 30, y: -12, label: '2' },
        { id: uuid(), componentId, x: 30, y: -4, label: '4' },
        { id: uuid(), componentId, x: 30, y: 4, label: '6' },
        { id: uuid(), componentId, x: 30, y: 12, label: '8' },
        { id: uuid(), componentId, x: -10, y: -24, label: 'AUX_24V' },
        { id: uuid(), componentId, x: 10, y: -24, label: 'AUX_0V' },
        { id: uuid(), componentId, x: 0, y: 24, label: 'RS485_A' },
        { id: uuid(), componentId, x: 16, y: 24, label: 'RS485_B' },
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
        { id: uuid(), componentId, x: -20, y: -25, label: '1' },
        { id: uuid(), componentId, x: -20, y: 25, label: '2' },
        { id: uuid(), componentId, x: 0, y: -25, label: '3' },
        { id: uuid(), componentId, x: 0, y: 25, label: '4' },
        { id: uuid(), componentId, x: 20, y: -25, label: '5' },
        { id: uuid(), componentId, x: 20, y: 25, label: '6' },
      ];
    case 'motorized_mccb':
      return [
        ...motorizedMccbPowerConnectionPoints(componentId, false),
        ...mccbControlConnectionPoints(componentId),
      ];
    case 'four_pole_motorized_mccb':
      return [
        ...motorizedMccbPowerConnectionPoints(componentId, true),
        ...mccbControlConnectionPoints(componentId),
      ];
    case 'four_phase_mcb':
      return [
        { id: uuid(), componentId, x: -30, y: -25, label: '1' },
        { id: uuid(), componentId, x: -30, y: 25, label: '2' },
        { id: uuid(), componentId, x: -10, y: -25, label: '3' },
        { id: uuid(), componentId, x: -10, y: 25, label: '4' },
        { id: uuid(), componentId, x: 10, y: -25, label: '5' },
        { id: uuid(), componentId, x: 10, y: 25, label: '6' },
        { id: uuid(), componentId, x: 30, y: -25, label: '7' },
        { id: uuid(), componentId, x: 30, y: 25, label: '8' },
      ];
    case 'air_circuit_breaker':
      return [
        ...acbPowerConnectionPoints(componentId),
        ...acbControlConnectionPoints(componentId),
      ];
    case 'switch':
    case 'push_button':
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: '1' },
        { id: uuid(), componentId, x: 0, y: 20, label: '2' },
      ];
    case 'two_way_switch':
      return [
        { id: uuid(), componentId, x: 0, y: 20, label: 'COM' },
        { id: uuid(), componentId, x: -14, y: -20, label: 'T1' },
        { id: uuid(), componentId, x: 14, y: -20, label: 'T2' },
      ];
    case 'mcb':
      return createMcbConnectionPoints(
        componentId,
        options?.mcbPoles === 2 ? 2 : 1
      );
    case 'hrc_fuse':
    case 'control_circuit_fuse':
      return [
        { id: uuid(), componentId, x: 0, y: -25, label: '1' },
        { id: uuid(), componentId, x: 0, y: 25, label: '2' },
      ];
    case 'earth_leakage_relay_cbct':
      return [
        { id: uuid(), componentId, x: 0, y: -25, label: '1' },
        { id: uuid(), componentId, x: 0, y: 25, label: '2' },
      ];
    case 'rcd':
    case 'residual_current_circuit_breaker': {
      const poles = options?.rcdPoles === 4 ? 4 : 2;
      if (poles === 4) {
        return [
          { id: uuid(), componentId, x: -30, y: -25, label: '1' },
          { id: uuid(), componentId, x: -30, y: 25, label: '2' },
          { id: uuid(), componentId, x: -10, y: -25, label: '3' },
          { id: uuid(), componentId, x: -10, y: 25, label: '4' },
          { id: uuid(), componentId, x: 10, y: -25, label: '5' },
          { id: uuid(), componentId, x: 10, y: 25, label: '6' },
          { id: uuid(), componentId, x: 30, y: -25, label: '7' },
          { id: uuid(), componentId, x: 30, y: 25, label: '8' },
        ];
      }
      return createMcbConnectionPoints(componentId, 2);
    }
    case 'overload_relay':
      return [
        { id: uuid(), componentId, x: 0, y: -25, label: '1' },
        { id: uuid(), componentId, x: 0, y: 25, label: '2' },
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
      return createBusbarConnectionPoints(
        componentId,
        options?.busbarLeftCount ?? 3,
        options?.busbarRightCount ?? 3
      );
    case 'terminal_block':
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: '1' },
        { id: uuid(), componentId, x: 0, y: 20, label: '2' },
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
      return [
        { id: uuid(), componentId, x: 0, y: -25, label: 'T1' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'T2' },
        { id: uuid(), componentId, x: -20, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 20, y: 0, label: 'A2' },
        ...(type === 'contactor' ? contactorAuxConnectionPoints(componentId) : []),
      ];
    case 'timer':
      return [
        { id: uuid(), componentId, x: 0, y: -25, label: 'COM' },
        { id: uuid(), componentId, x: -14, y: 25, label: 'NC' },
        { id: uuid(), componentId, x: 14, y: 25, label: 'NO' },
        { id: uuid(), componentId, x: -20, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 20, y: 0, label: 'A2' },
      ];
    case 'three_phase_contactor':
      return [
        { id: uuid(), componentId, x: -20, y: -25, label: 'T1' },
        { id: uuid(), componentId, x: -20, y: 25, label: 'T2' },
        { id: uuid(), componentId, x: 0, y: -25, label: 'T3' },
        { id: uuid(), componentId, x: 0, y: 25, label: 'T4' },
        { id: uuid(), componentId, x: 20, y: -25, label: 'T5' },
        { id: uuid(), componentId, x: 20, y: 25, label: 'T6' },
        { id: uuid(), componentId, x: -36, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 36, y: 0, label: 'A2' },
        ...contactorAuxConnectionPoints(componentId),
      ];
    case 'four_phase_contactor':
      return [
        { id: uuid(), componentId, x: -30, y: -25, label: 'T1' },
        { id: uuid(), componentId, x: -30, y: 25, label: 'T2' },
        { id: uuid(), componentId, x: -10, y: -25, label: 'T3' },
        { id: uuid(), componentId, x: -10, y: 25, label: 'T4' },
        { id: uuid(), componentId, x: 10, y: -25, label: 'T5' },
        { id: uuid(), componentId, x: 10, y: 25, label: 'T6' },
        { id: uuid(), componentId, x: 30, y: -25, label: 'T7' },
        { id: uuid(), componentId, x: 30, y: 25, label: 'T8' },
        { id: uuid(), componentId, x: -44, y: 0, label: 'A1' },
        { id: uuid(), componentId, x: 44, y: 0, label: 'A2' },
        ...contactorAuxConnectionPoints(componentId),
      ];
    case 'estop':
      // IEC mushroom NC: IN top, OUT bottom — series device that opens when
      // the head is pressed (latched). Reset via Properties → Reset.
      return [
        { id: uuid(), componentId, x: 0, y: -22, label: '1' },
        { id: uuid(), componentId, x: 0, y: 22, label: '2' },
      ];
    case 'door_interlock':
    case 'mechanical_interlock':
      // Guarded door switch in series with control loop.
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: '1' },
        { id: uuid(), componentId, x: 0, y: 20, label: '2' },
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
      // BMS-interface relay: 24 V DC coil A1/A2, dry NO contact T1–T2.
      // Sized smaller than a normal control relay; no 13/14/21/22 aux block.
      return [
        { id: uuid(), componentId, x: 0, y: -20, label: 'T1' },
        { id: uuid(), componentId, x: 0, y: 20, label: 'T2' },
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
      // Numbered in/out pairs 1–2 … 7–8 (odd in, even out).
      return [
        { id: uuid(), componentId, x: -30, y: -25, label: '1' },
        { id: uuid(), componentId, x: -30, y: 25, label: '2' },
        { id: uuid(), componentId, x: -10, y: -25, label: '3' },
        { id: uuid(), componentId, x: -10, y: 25, label: '4' },
        { id: uuid(), componentId, x: 10, y: -25, label: '5' },
        { id: uuid(), componentId, x: 10, y: 25, label: '6' },
        { id: uuid(), componentId, x: 30, y: -25, label: '7' },
        { id: uuid(), componentId, x: 30, y: 25, label: '8' },
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

function inferWireMetadata(
  fromLabel: string,
  toLabel: string
): Pick<Wire, 'color' | 'wireCategory' | 'wireProtocol'> {
  const color = inferWireColor(fromLabel, toLabel);
  if (color === 'ethernet') {
    const joined = `${fromLabel} ${toLabel}`.toUpperCase();
    const protocol = joined.includes('BACNET')
      ? 'bacnet_ip'
      : joined.includes('MODBUS')
        ? 'modbus_tcp'
        : 'ethernet';
    return { color, wireCategory: 'comm', wireProtocol: protocol };
  }
  return { color, wireCategory: 'control', wireProtocol: 'none' };
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
  const labs = new Set(
    comp.connectionPoints.map((cp) => labelNorm(cp.label))
  );
  if (
    labs.has('1') &&
    labs.has('2') &&
    labs.has('3') &&
    labs.has('4') &&
    comp.connectionPoints.length >= 4
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

export {
  getConnectionPointAbsolutePosition,
  syncWireEndpoints,
  createConnectionPoints,
  labelNorm,
  inferWireMetadata,
  mcbLayoutPoles,
  remapWireEndpointsForMorph,
  buildPointRemapByLabels,
  ensureBreakerControlTerminals,
};
