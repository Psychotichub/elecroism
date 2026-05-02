import type {
  Circuit,
  ComponentType,
  ToolMode,
  WireColor,
} from '../types';
import { DEFAULT_WIRE_OBJECT_SNAP_MODES } from '../types';
import { useCircuitStore } from '../store/circuitStore';
import { parseWireStyleLayerArg } from './wireStyleLayers';

const WIRE_COLOR_CMD: Record<string, WireColor> = {
  brown: 'brown',
  blue: 'blue',
  black: 'black',
  grey: 'grey',
  gray: 'grey',
  red: 'red',
  gy: 'green_yellow',
  g_y: 'green_yellow',
  green_yellow: 'green_yellow',
  'green/yellow': 'green_yellow',
  earth: 'green_yellow',
  pe: 'green_yellow',
  ethernet: 'ethernet',
};

const BASE_COMMAND_HINTS: string[] = [
  'add',
  'clear',
  'copy',
  'help',
  'line',
  'pan',
  'select',
  'wire',
  'osnap',
  'osnap all',
  'osnap none',
  'snap',
  'grid',
  'ortho',
  'autoroute',
  'autowire',
  'trim',
  'extend',
  'join',
  'break',
  'fillet',
  'wirecolor',
  'wiretype',
  'wirelayer',
  'wirestyle',
  'power_ac',
  'power_dc',
  'control_ac',
  'control_dc',
  'earth_pe',
  'communication',
  'instrumentation_analog',
  'labels',
  'labels on',
  'labels off',
  'normalize',
  'cleanup',
  'wiresch',
  'wireschedule',
  'exportwires',
  'z',
  'ze',
  'zi',
  'zo',
];

type CadCommandContext = {
  raw: string;
  circuit: Circuit;
  selectedId: string | null;
  setTool: (tool: ToolMode) => void;
  addComponent: (type: ComponentType, x: number, y: number) => void;
  setSelected: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  duplicateComponent: (id: string) => void;
};

const ALL_COMPONENT_TYPES: ComponentType[] = [
  'switch',
  'socket',
  'mcb',
  'hrc_fuse',
  'control_circuit_fuse',
  'earth_leakage_relay_cbct',
  'rcd',
  'residual_current_circuit_breaker',
  'lamp',
  'motor',
  'heater',
  'panel_heater',
  'cooling_fan',
  'busbar',
  'busbar_system',
  'neutral_bar_system',
  'earth_bar_grounding_system',
  'terminal_block',
  'wire',
  'power_source',
  'dc_power_source',
  'ac_dc_converter',
  'control_transformer',
  'junction',
  'push_button',
  'generic_load',
  'contactor',
  'relay',
  'smart_relay',
  'timer',
  'overload_relay',
  'three_phase_source',
  'three_phase_motor',
  'three_phase_mcb',
  'mccb',
  'motor_protection_circuit_breaker',
  'four_phase_mcb',
  'air_circuit_breaker',
  'motorized_mccb',
  'four_pole_motorized_mccb',
  'three_phase_contactor',
  'four_phase_contactor',
  'estop',
  'selector_switch',
  'indicator_lamp',
  'phase_indicator_bank',
  'smps',
  'interposing_relay',
  'aux_contact_block',
  'energy_meter',
  'digital_multifunction_meter',
  'multimeter',
  'door_interlock',
  'mechanical_interlock',
  'modbus_tcp_gateway',
  'modbus_rtu_module',
  'bacnet_ip_gateway',
  'di_module',
  'do_module',
  'ai_module',
  'ao_module',
  'relay_interface_card',
  'communication_converter',
  'iot_gateway',
  'cloud_monitoring_module',
  'energy_management_controller',
  'ethernet_switch',
  'signal_isolator',
  'optocoupler_module',
  'ups_module',
  'dc_battery_backup',
  'motor_operator_kit',
  'shunt_trip_coil',
  'closing_coil',
  'uvr_release',
  'key_interlock',
  'neutral_link',
  'earth_link',
  'current_transformer',
  'voltage_transformer',
  'din_rail',
  'mounting_plate',
  'cable_duct',
  'busbar_support_insulator',
  'ferrule_cable_markers',
  'control_wiring',
  'power_cables',
  'ms_gi_sheet_enclosure',
  'ip_rated_enclosure',
  'power_quality_analyzer',
];

const componentAliasMap: Record<string, ComponentType> = ALL_COMPONENT_TYPES.reduce(
  (acc, type) => {
    acc[type] = type;
    return acc;
  },
  {} as Record<string, ComponentType>
);

Object.assign(componentAliasMap, {
  pb: 'push_button',
  source: 'power_source',
  four_pole_mccb: 'four_pole_motorized_mccb',
  dmfm: 'digital_multifunction_meter',
  em: 'energy_meter',
});

export const CAD_COMMAND_HINTS: string[] = [
  ...BASE_COMMAND_HINTS,
  ...Object.keys(componentAliasMap),
].sort((a, b) => a.localeCompare(b));

export function getCadCommandSuggestions(prefix: string): string[] {
  const token = prefix.trim().toLowerCase();
  if (!token) return [];
  return CAD_COMMAND_HINTS.filter((c) => c.startsWith(token)).slice(0, 4);
}

export function resolveComponentCommand(raw: string): ComponentType | null {
  const parts = raw.trim().toLowerCase().split(/\s+/);
  const cmd = parts[0];
  if (!cmd) return null;

  if (cmd === 'add') {
    const alias = parts[1];
    return alias ? componentAliasMap[alias] ?? null : null;
  }

  return componentAliasMap[cmd] ?? null;
}

function zoomExtents(ctx: CadCommandContext): string {
  const { circuit, setZoom, setPan } = ctx;
  if (circuit.components.length === 0) {
    setZoom(1);
    setPan(0, 0);
    return 'Zoom extents: empty canvas';
  }
  const xs = circuit.components.map((c) => c.x);
  const ys = circuit.components.map((c) => c.y);
  const minX = Math.min(...xs) - 120;
  const maxX = Math.max(...xs) + 120;
  const minY = Math.min(...ys) - 120;
  const maxY = Math.max(...ys) + 120;
  const worldW = Math.max(200, maxX - minX);
  const worldH = Math.max(200, maxY - minY);
  const viewportW = window.innerWidth * 0.65;
  const viewportH = window.innerHeight * 0.72;
  const fitZoom = Math.max(
    0.1,
    Math.min(5, Math.min(viewportW / worldW, viewportH / worldH))
  );
  const panX = viewportW * 0.5 - ((minX + maxX) * 0.5) * fitZoom;
  const panY = viewportH * 0.5 - ((minY + maxY) * 0.5) * fitZoom;
  setZoom(fitZoom);
  setPan(panX, panY);
  return 'Zoom extents';
}

export function runCadCommand(ctx: CadCommandContext): string {
  const { raw, setTool, setSelected, selectedId, duplicateComponent, circuit } = ctx;
  const parts = raw.trim().toLowerCase().split(/\s+/);
  const cmd = parts[0];
  if (!cmd) return '';

  if (cmd === 'help' || cmd === '?') {
    return [
      'wire|w line|l · select|s · pan|p · ortho · snap|grid · osnap [all|none]',
      'autoroute|autowire · wirecolor <color|auto> · wiretype power|control|comm|auto',
      'break (click segment) · trim (two interior grips) · extend [from|to] (then click crossing wire)',
      'join · fillet 0 · labels [on|off] · wirelayer power_ac|…|instrumentation_analog',
      'z ze zi zo · add <type> [x y] · copy · clear',
    ].join(' — ');
  }
  if (cmd === 'select' || cmd === 's') {
    setTool('select');
    return 'Tool set to Select';
  }
  if (cmd === 'wire' || cmd === 'l' || cmd === 'line' || cmd === 'w') {
    setTool('wire');
    return 'Tool set to Wire';
  }
  if (cmd === 'osnap') {
    const arg = parts[1];
    if (arg === 'all' || arg === 'default') {
      useCircuitStore.setState({
        wireObjectSnapEnabled: true,
        wireSnapModes: { ...DEFAULT_WIRE_OBJECT_SNAP_MODES },
      });
      return 'Object snap on — connection, endpoint, midpoint, intersection';
    }
    if (arg === 'none') {
      useCircuitStore.setState({
        wireObjectSnapEnabled: false,
        wireSnapModes: {
          connection: false,
          endpoint: false,
          midpoint: false,
          intersection: false,
        },
      });
      return 'Object snap off (all modes)';
    }
    useCircuitStore.getState().toggleWireObjectSnap();
    const on = useCircuitStore.getState().wireObjectSnapEnabled;
    return `Wire object snap master: ${on ? 'on' : 'off'}`;
  }
  if (cmd === 'snap') {
    useCircuitStore.getState().toggleWireGridSnap();
    const on = useCircuitStore.getState().wireGridSnapEnabled;
    return `Wire grid snap: ${on ? 'on' : 'off'}`;
  }
  if (cmd === 'grid') {
    useCircuitStore.getState().toggleWireGridSnap();
    const on = useCircuitStore.getState().wireGridSnapEnabled;
    return `Wire grid snap: ${on ? 'on' : 'off'}`;
  }
  if (cmd === 'ortho') {
    useCircuitStore.getState().toggleWireOrtho();
    const on = useCircuitStore.getState().wireOrthoEnabled;
    return `Wire ortho: ${on ? 'on' : 'off'}`;
  }
  if (cmd === 'autoroute' || cmd === 'autowire') {
    useCircuitStore.getState().toggleWireAutoRoute();
    const on = useCircuitStore.getState().wireAutoRouteEnabled;
    return `Wire auto-route (terminal-to-terminal): ${on ? 'on' : 'off'}`;
  }
  if (cmd === 'wirecolor') {
    const arg = parts[1];
    if (!arg || arg === 'auto' || arg === 'default') {
      useCircuitStore.getState().patchWireDraftStyle({ color: null });
      return 'Next wire color: auto (from terminals)';
    }
    const color = WIRE_COLOR_CMD[arg];
    if (!color) {
      return `Unknown color "${arg}". Try: brown blue black grey red gy ethernet`;
    }
    useCircuitStore.getState().patchWireDraftStyle({ color });
    return `Next wire color: ${color}`;
  }
  if (cmd === 'wiretype') {
    const arg = parts[1];
    if (!arg || arg === 'auto' || arg === 'default') {
      useCircuitStore.getState().patchWireDraftStyle({ wireCategory: null });
      return 'Next wire category: auto (from terminals)';
    }
    if (arg === 'power' || arg === 'control' || arg === 'comm') {
      useCircuitStore.getState().patchWireDraftStyle({ wireCategory: arg });
      return `Next wire category: ${arg}`;
    }
    return 'Usage: wiretype power|control|comm|auto';
  }
  if (cmd === 'wirelayer' || cmd === 'wirestyle') {
    const raw = parts.slice(1).join(' ').replace(/\s+/g, '_').toLowerCase();
    if (!raw || raw === 'auto' || raw === 'none' || raw === 'clear' || raw === 'off') {
      useCircuitStore.getState().patchWireDraftStyle({ styleLayer: null });
      return 'Next wire style layer: off (use terminals / wirecolor)';
    }
    const layer = parseWireStyleLayerArg(raw);
    if (!layer) {
      return 'Unknown layer. Try: power_ac power_dc control_ac control_dc earth_pe neutral communication instrumentation_analog';
    }
    useCircuitStore.getState().patchWireDraftStyle({ styleLayer: layer });
    return `Next wire style layer: ${layer}`;
  }
  if (cmd === 'fillet') {
    const arg = parts[1];
    if (arg === '0' || arg === 'zero') {
      useCircuitStore.getState().setWireOrthoEnabled(true);
      return 'Fillet radius 0: ortho on (square corners)';
    }
    return 'Usage: fillet 0  (turns ortho on for square corners)';
  }
  if (cmd === 'break') {
    setTool('select');
    useCircuitStore.getState().setWireCadEditMode('break');
    return 'Break: click a wire segment (splits at junction). Esc cancels.';
  }
  if (cmd === 'trim') {
    setTool('select');
    useCircuitStore.getState().setWireCadEditMode('trim');
    return 'Trim: select wire, tap two interior vertex grips to reroute between them. Esc cancels.';
  }
  if (cmd === 'extend') {
    setTool('select');
    const endArg = parts[1];
    const end: 'from' | 'to' =
      endArg === 'to' || endArg === 'end' ? 'to' : 'from';
    const st = useCircuitStore.getState();
    st.setWireCadExtendEnd(end);
    st.setWireCadEditMode('extend');
    return `Extend (${end} end): select wire, then click a crossing wire. Usage: extend | extend to | extend from. Esc cancels.`;
  }
  if (cmd === 'join') {
    const st = useCircuitStore.getState();
    const sid = st.selectedId;
    if (!sid) return 'Join: select a wire (simplify collinear) or a junction (merge two wires)';
    const comp = st.circuit.components.find((c) => c.id === sid);
    if (comp?.type === 'junction') {
      return st.mergeWiresAtJunction(sid) || 'Merged wires through junction';
    }
    if (st.circuit.wires.some((w) => w.id === sid)) {
      return st.simplifyWireCollinear(sid) || 'Removed collinear bends';
    }
    return 'Join: select a wire or junction first';
  }
  if (cmd === 'normalize' || cmd === 'cleanup') {
    const st = useCircuitStore.getState();
    const sid = st.selectedId;
    if (!sid || !st.circuit.wires.some((w) => w.id === sid)) {
      return 'Normalize: select a wire first';
    }
    return st.normalizeWireRoute(sid) || 'Normalized wire polyline';
  }
  if (cmd === 'wiresch' || cmd === 'wireschedule' || cmd === 'exportwires') {
    useCircuitStore.getState().exportWireScheduleCsv();
    return 'Wire schedule CSV downloaded';
  }
  if (cmd === 'labels') {
    const v = parts[1];
    const st = useCircuitStore.getState();
    if (v === 'off' || v === '0' || v === 'hide') {
      st.setCircuitWireLabelsVisible(false);
      return 'Wire labels: hidden';
    }
    if (v === 'on' || v === '1' || v === 'show') {
      st.setCircuitWireLabelsVisible(true);
      return 'Wire labels: visible';
    }
    const cur = st.circuit.wireLabelsVisible !== false;
    st.setCircuitWireLabelsVisible(!cur);
    return `Wire labels: ${!cur ? 'visible' : 'hidden'}`;
  }
  if (cmd === 'pan' || cmd === 'p') {
    setTool('pan');
    return 'Tool set to Pan';
  }
  if (cmd === 'clear') {
    setSelected(null);
    return 'Selection cleared';
  }
  if (cmd === 'copy' || cmd === 'co' || cmd === 'c') {
    if (!selectedId) return 'Select one component to copy';
    duplicateComponent(selectedId);
    return 'Component copied';
  }
  if (cmd === 'zi') {
    ctx.setZoom(circuit.zoom * 1.2);
    return 'Zoom in';
  }
  if (cmd === 'zo') {
    ctx.setZoom(circuit.zoom / 1.2);
    return 'Zoom out';
  }
  if (cmd === 'ze') return zoomExtents(ctx);
  if (cmd === 'zoom' || cmd === 'z') {
    const arg = parts[1];
    if (!arg || arg === 'e' || arg === 'extents' || arg === 'all') return zoomExtents(ctx);
    if (arg === 'i' || arg === 'in') {
      ctx.setZoom(circuit.zoom * 1.2);
      return 'Zoom in';
    }
    if (arg === 'o' || arg === 'out') {
      ctx.setZoom(circuit.zoom / 1.2);
      return 'Zoom out';
    }
    const zValue = Number(arg);
    if (Number.isFinite(zValue) && zValue > 0) {
      ctx.setZoom(zValue / 100);
      return `Zoom ${zValue}%`;
    }
    return 'Usage: z [e|i|o|percent]';
  }
  if (cmd === 'add') {
    const alias = parts[1];
    const type = alias ? componentAliasMap[alias] : undefined;
    if (!type) return 'Unknown component. Try: add mcb';
    const xArg = parts[2] ? Number(parts[2]) : Number.NaN;
    const yArg = parts[3] ? Number(parts[3]) : Number.NaN;
    const defaultX = (window.innerWidth * 0.5 - circuit.panX) / circuit.zoom;
    const defaultY = (window.innerHeight * 0.45 - circuit.panY) / circuit.zoom;
    const x = Number.isFinite(xArg) ? xArg : defaultX;
    const y = Number.isFinite(yArg) ? yArg : defaultY;
    const snappedX = Math.round(x / circuit.gridSize) * circuit.gridSize;
    const snappedY = Math.round(y / circuit.gridSize) * circuit.gridSize;
    ctx.addComponent(type, snappedX, snappedY);
    return `Added ${type}`;
  }

  // AutoCAD-style direct placement: typing just the component alias creates it.
  // Examples: "mcb", "contactor 200 120"
  const directType = componentAliasMap[cmd];
  if (directType) {
    const xArg = parts[1] ? Number(parts[1]) : Number.NaN;
    const yArg = parts[2] ? Number(parts[2]) : Number.NaN;
    const defaultX = (window.innerWidth * 0.5 - circuit.panX) / circuit.zoom;
    const defaultY = (window.innerHeight * 0.45 - circuit.panY) / circuit.zoom;
    const x = Number.isFinite(xArg) ? xArg : defaultX;
    const y = Number.isFinite(yArg) ? yArg : defaultY;
    const snappedX = Math.round(x / circuit.gridSize) * circuit.gridSize;
    const snappedY = Math.round(y / circuit.gridSize) * circuit.gridSize;
    ctx.addComponent(directType, snappedX, snappedY);
    return `Added ${directType}`;
  }

  return 'Unknown command. Type help';
}
