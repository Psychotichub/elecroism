export type ComponentType =
  | 'switch'
  | 'socket'
  | 'mcb'
  | 'rcd'
  | 'lamp'
  | 'motor'
  | 'heater'
  | 'busbar'
  | 'wire'
  | 'power_source'
  | 'junction'
  | 'push_button'
  | 'generic_load'
  | 'contactor'
  | 'relay'
  | 'timer'
  | 'overload_relay';

export type ComponentState = 'on' | 'off' | 'tripped' | 'fault';

export type WireColor = 'brown' | 'blue' | 'green_yellow' | 'black' | 'grey' | 'red';

export type PhaseSystem = 'single_phase' | 'three_phase';

export interface ConnectionPoint {
  id: string;
  componentId: string;
  x: number;
  y: number;
  label: string;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  label: string;
  x: number;
  y: number;
  rotation: number;
  state: ComponentState;
  selected: boolean;
  connectionPoints: ConnectionPoint[];
  properties: ComponentProperties;
}

export interface ComponentProperties {
  switchType?: 'SPST' | 'SPDT' | 'DPST' | 'DPDT';
  poles?: number;

  ratingAmps?: number;
  tripCurve?: 'B' | 'C' | 'D';
  breakingCapacity?: 6000 | 10000;
  rcdSensitivity?: 10 | 30 | 100 | 300;

  socketType?: 'schuko' | 'UK' | 'US' | 'IEC';
  voltage?: number;

  powerWatts?: number;
  loadType?: 'resistive' | 'inductive' | 'capacitive';
  powerFactor?: number;

  crossSection?: 1.5 | 2.5 | 4 | 6 | 10;
  wireColor?: WireColor;

  phaseSystem?: PhaseSystem;
  phaseVoltage?: number;
  lineVoltage?: number;

  buttonType?: 'NO' | 'NC';

  color?: string;
  fontSize?: number;
}

export interface Wire {
  id: string;
  fromComponentId: string;
  fromPointId: string;
  toComponentId: string;
  toPointId: string;
  points: number[];
  color: WireColor;
  crossSection: number;
  energized: boolean;
  currentAmps: number;
}

export interface Circuit {
  id: string;
  name: string;
  components: CircuitComponent[];
  wires: Wire[];
  gridSize: number;
  zoom: number;
  panX: number;
  panY: number;
  createdAt: string;
  updatedAt: string;
}

export interface NodeResult {
  nodeId: string;
  voltageV: number;
  currentA: number;
  powerW: number;
  powerVA?: number;
  powerFactor?: number;
  energized: boolean;
}

export interface SimulationResult {
  success: boolean;
  nodes: Record<string, NodeResult>;
  faults: FaultEvent[];
  timestamp: number;
  totalPowerW: number;
  totalCurrentA: number;
}

export interface FaultEvent {
  id: string;
  type: 'overload' | 'short_circuit' | 'earth_fault' | 'arc_fault';
  affectedComponentId: string;
  message: string;
  severity: 'warning' | 'critical';
  timestamp: number;
}

export type ToolMode = 'select' | 'wire' | 'delete' | 'pan';

export interface HistoryEntry {
  circuit: Circuit;
  description: string;
}
