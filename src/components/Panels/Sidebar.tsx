import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from '../../types';
import { isDarkSurface, useThemeStore, themeColors } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import {
  clearDragComponentType,
  setDragComponentType,
} from '../../utils/dragState';
import {
  COMPONENT_PANEL_DESCRIPTIONS,
  formatComponentPanelHelpText,
} from '../../utils/componentPanelInfo';
import {
  FiZap,
  FiShield,
  FiToggleLeft,
  FiCircle,
  FiSun,
  FiActivity,
  FiLink,
  FiAlertOctagon,
  FiBatteryCharging,
  FiChevronRight,
  FiChevronDown,
  FiSliders,
  FiBox,
  FiStar,
  FiSearch,
  FiChevronsDown,
  FiChevronsUp,
} from 'react-icons/fi';
import {
  loadFavoriteTypes,
  toggleFavoriteType,
} from '../../utils/sidebarPaletteStorage';

/** Persisted across reloads so users keep their preferred groups expanded. */
const COLLAPSE_STORAGE_KEY = 'electrosim.sidebarCollapsedGroups.v1';
/** Search field + category chips visibility. */
const PALETTE_SEARCH_PANEL_KEY = 'electrosim.sidebarPaletteSearchExpanded.v1';
/** Scrollable component group list visibility. */
const PALETTE_COMPONENT_LIST_KEY = 'electrosim.sidebarPaletteListExpanded.v1';
/** Legacy single toggle; used once to seed both panels if new keys are absent. */
const LEGACY_PALETTE_BODY_KEY = 'electrosim.sidebarPaletteBodyExpanded.v1';

interface ComponentItem {
  type: ComponentType;
  label: string;
  icon: React.ReactNode;
  detail?: string;
  /** Single-phase MCB palette: drop as 2-pole (L+N) layout. */
  mcbInitialPoles?: 1 | 2;
}

interface ComponentGroup {
  name: string;
  emoji: string;
  items: ComponentItem[];
}

const GROUPS: ComponentGroup[] = [
  {
    name: 'Power',
    emoji: '⚡',
    items: [
      { type: 'power_source', label: 'AC Source 230V', icon: <FiZap /> },
      {
        type: 'dc_power_source',
        label: 'DC Supply',
        icon: <FiZap />,
        detail: 'Adjustable V · + / −',
      },
      {
        type: 'ac_dc_converter',
        label: 'AC/DC Converter (linear)',
        icon: <FiZap />,
        detail: 'XFMR → RECT → C → REG · vs SMPS symbol',
      },
      {
        type: 'three_phase_source',
        label: '3φ Supply 400V',
        icon: <FiZap />,
        detail: 'L1 L2 L3 + N',
      },
      { type: 'busbar', label: 'Busbar', icon: <FiActivity />, detail: 'Generic distribution bar' },
      {
        type: 'busbar_system',
        label: 'Busbar system',
        icon: <FiActivity />,
        detail: 'Main copper/aluminium distribution bar',
      },
      {
        type: 'neutral_bar_system',
        label: 'Neutral bar system',
        icon: <FiActivity />,
        detail: 'Neutral distribution bar',
      },
      {
        type: 'earth_bar_grounding_system',
        label: 'Earth bar / grounding',
        icon: <FiActivity />,
        detail: 'Protective earth distribution bar',
      },
    ],
  },
  {
    name: 'Protection',
    emoji: '🛡️',
    items: [
      {
        type: 'mcb',
        label: 'MCB',
        icon: <FiShield />,
        detail: '1P · set rating in properties',
      },
      {
        type: 'hrc_fuse',
        label: 'HRC fuse',
        icon: <FiShield />,
        detail: 'Cartridge fuse · replace after trip',
      },
      {
        type: 'control_circuit_fuse',
        label: 'Control circuit fuse',
        icon: <FiShield />,
        detail: 'Low-amp fuse for control supply branch',
      },
      {
        type: 'earth_leakage_relay_cbct',
        label: 'ELR + CBCT',
        icon: <FiShield />,
        detail: 'Earth fault relay with toroid CT',
      },
      { type: 'rcd', label: 'RCD', icon: <FiShield />, detail: 'Set sensitivity in properties' },
      {
        type: 'residual_current_circuit_breaker',
        label: 'Residual current CB',
        icon: <FiShield />,
        detail: 'RCCB earth-leakage protection',
      },
      { type: 'overload_relay', label: 'Overload Relay', icon: <FiShield /> },
      {
        type: 'three_phase_mcb',
        label: '3P MCB',
        icon: <FiShield />,
        detail: 'L1–L3 · rating in properties',
      },
      {
        type: 'mccb',
        label: 'MCCB',
        icon: <FiShield />,
        detail: '3P molded case circuit breaker',
      },
      {
        type: 'motor_protection_circuit_breaker',
        label: 'MPCB',
        icon: <FiShield />,
        detail: 'Motor protection breaker, 3P',
      },
      {
        type: 'four_phase_mcb',
        label: '4P MCB',
        icon: <FiShield />,
        detail: 'L1–L3 + N · rating in properties',
      },
      {
        type: 'air_circuit_breaker',
        label: 'ACB',
        icon: <FiShield />,
        detail: '4P incomer · Ir / Ii / ST / earth G',
      },
      {
        type: 'motorized_mccb',
        label: 'Motor MCCB',
        icon: <FiShield />,
        detail: '3P + BMS MOT / ST / aux / trip',
      },
      {
        type: 'four_pole_motorized_mccb',
        label: '4P Motor MCCB',
        icon: <FiShield />,
        detail: 'L1–L3 + N + BMS control block',
      },
    ],
  },
  {
    name: 'Controls',
    emoji: '🎛️',
    items: [
      {
        type: 'switch',
        label: 'Switch',
        icon: <FiToggleLeft />,
        detail: 'SPST / DPST in properties',
      },
      {
        type: 'two_way_switch',
        label: 'Two-way switch',
        icon: <FiToggleLeft />,
        detail: 'SPDT: COM · T1 · T2 — double-click to throw',
      },
      {
        type: 'push_button',
        label: 'Push button',
        icon: <FiCircle />,
        detail: 'NO / NC in properties',
      },
      {
        type: 'selector_switch',
        label: 'Selector AUTO/MAN',
        icon: <FiToggleLeft />,
        detail: '3-pos: COM → AUTO / MAN / OFF',
      },
      { type: 'contactor', label: 'Contactor', icon: <FiToggleLeft /> },
      { type: 'relay', label: 'Relay', icon: <FiToggleLeft /> },
      {
        type: 'smart_relay',
        label: 'Smart relay',
        icon: <FiActivity />,
        detail: 'Programmable compact control relay',
      },
      {
        type: 'interposing_relay',
        label: 'Interposing relay',
        icon: <FiToggleLeft />,
        detail: '24 V DC coil · BMS interface',
      },
      {
        type: 'aux_contact_block',
        label: 'Aux contact block',
        icon: <FiToggleLeft />,
        detail: '1NO (13-14) + 1NC (21-22)',
      },
      { type: 'timer', label: 'Timer', icon: <FiToggleLeft /> },
      {
        type: 'three_phase_contactor',
        label: '3P Contactor (KM)',
        icon: <FiToggleLeft />,
        detail: 'L1–L3 + A1 A2 · 13/14 NO · 21/22 NC',
      },
      {
        type: 'four_phase_contactor',
        label: '4P Contactor (KM)',
        icon: <FiToggleLeft />,
        detail: 'L1–L3–N + A1 A2 · 13/14 · 21/22',
      },
    ],
  },
  {
    name: 'Safety',
    emoji: '🛑',
    items: [
      {
        type: 'estop',
        label: 'Emergency Stop',
        icon: <FiAlertOctagon />,
        detail: 'NC mushroom · click latches',
      },
      {
        type: 'door_interlock',
        label: 'Door interlock',
        icon: <FiShield />,
        detail: 'Panel door closed = contact closed',
      },
      {
        type: 'mechanical_interlock',
        label: 'Mechanical interlock',
        icon: <FiShield />,
        detail: 'Mechanical ON/OFF prevention link',
      },
    ],
  },
  {
    name: 'Indicators & Metering',
    emoji: '📟',
    items: [
      {
        type: 'indicator_lamp',
        label: 'Indicator lamp',
        icon: <FiSun />,
        detail: 'Colour + L1/L2/L3 tag in properties',
      },
      {
        type: 'phase_indicator_bank',
        label: 'Phase indicator bank',
        icon: <FiSun />,
        detail: 'L1/L2/L3 panel phase presence lamps',
      },
      {
        type: 'energy_meter',
        label: 'Energy meter',
        icon: <FiActivity />,
        detail: 'V / A / kW · Modbus tag',
      },
      {
        type: 'digital_multifunction_meter',
        label: 'Digital multifunction meter',
        icon: <FiActivity />,
        detail: 'V/A/kW/PF panel metering',
      },
      {
        type: 'multimeter',
        label: 'Digital multimeter',
        icon: <FiActivity />,
        detail: 'Voltage / current / continuity + buzzer',
      },
    ],
  },
  {
    name: 'Control Power',
    emoji: '🔋',
    items: [
      {
        type: 'control_transformer',
        label: 'Control transformer',
        icon: <FiSliders />,
        detail: '415V/230V to 24V control supply',
      },
      {
        type: 'smps',
        label: 'SMPS 24V',
        icon: <FiBatteryCharging />,
        detail: 'Mains AC → DC bus · adjustable V',
      },
      {
        type: 'ups_module',
        label: 'UPS module',
        icon: <FiBatteryCharging />,
        detail: 'Control continuity backup',
      },
      {
        type: 'dc_battery_backup',
        label: 'DC battery backup',
        icon: <FiBatteryCharging />,
        detail: 'Critical control reserve',
      },
      {
        type: 'motor_operator_kit',
        label: 'Motor operator kit',
        icon: <FiToggleLeft />,
        detail: 'Breaker remote ON/OFF actuator',
      },
      {
        type: 'shunt_trip_coil',
        label: 'Shunt trip coil',
        icon: <FiToggleLeft />,
        detail: 'Breaker remote OFF trip coil',
      },
      {
        type: 'closing_coil',
        label: 'Closing coil',
        icon: <FiToggleLeft />,
        detail: 'Breaker remote ON closing actuator',
      },
      {
        type: 'uvr_release',
        label: 'UVR release',
        icon: <FiToggleLeft />,
        detail: 'Undervoltage release hold coil',
      },
    ],
  },
  {
    name: 'BMS Communication',
    emoji: '🌐',
    items: [
      {
        type: 'modbus_rtu_module',
        label: 'Modbus RTU module',
        icon: <FiActivity />,
        detail: 'RS485 serial Modbus interface',
      },
      {
        type: 'modbus_tcp_gateway',
        label: 'Modbus TCP gateway',
        icon: <FiActivity />,
        detail: 'Ethernet supervisory integration',
      },
      {
        type: 'bacnet_ip_gateway',
        label: 'BACnet/IP gateway',
        icon: <FiActivity />,
        detail: 'BAS integration via UDP/IP',
      },
      {
        type: 'communication_converter',
        label: 'Comm converter',
        icon: <FiActivity />,
        detail: 'RS232/RS485/Ethernet bridge',
      },
      {
        type: 'iot_gateway',
        label: 'IoT gateway',
        icon: <FiActivity />,
        detail: 'Edge-to-cloud telemetry bridge',
      },
      {
        type: 'cloud_monitoring_module',
        label: 'Cloud monitoring module',
        icon: <FiActivity />,
        detail: 'Remote dashboard and alert uplink',
      },
      {
        type: 'energy_management_controller',
        label: 'Energy management controller',
        icon: <FiActivity />,
        detail: 'Supervisory optimization/control node',
      },
      {
        type: 'ethernet_switch',
        label: 'Industrial Ethernet switch',
        icon: <FiActivity />,
        detail: 'Network fan-out for BMS devices',
      },
    ],
  },
  {
    name: 'BMS I/O',
    emoji: '🧩',
    items: [
      {
        type: 'di_module',
        label: 'DI module',
        icon: <FiActivity />,
        detail: 'Digital inputs from field contacts',
      },
      {
        type: 'do_module',
        label: 'DO module',
        icon: <FiActivity />,
        detail: 'Digital outputs to relays/coils',
      },
      {
        type: 'ai_module',
        label: 'AI module',
        icon: <FiActivity />,
        detail: 'Analog input (0-10V / 4-20mA)',
      },
      {
        type: 'ao_module',
        label: 'AO module',
        icon: <FiActivity />,
        detail: 'Analog output (0-10V / 4-20mA)',
      },
      {
        type: 'relay_interface_card',
        label: 'Relay interface card',
        icon: <FiActivity />,
        detail: 'Field relay isolation/fan-out',
      },
      {
        type: 'signal_isolator',
        label: 'Signal isolator',
        icon: <FiActivity />,
        detail: 'Galvanic isolation for analog loops',
      },
      {
        type: 'optocoupler_module',
        label: 'Optocoupler module',
        icon: <FiActivity />,
        detail: 'Digital optical isolation',
      },
    ],
  },
  {
    name: 'Infrastructure',
    emoji: '🧱',
    items: [
      {
        type: 'key_interlock',
        label: 'Key interlock',
        icon: <FiShield />,
        detail: 'Safe isolation sequence lock',
      },
      {
        type: 'neutral_link',
        label: 'Neutral link',
        icon: <FiLink />,
        detail: 'Neutral distribution bar',
      },
      {
        type: 'earth_link',
        label: 'Earth link',
        icon: <FiLink />,
        detail: 'Protective earth bar',
      },
      {
        type: 'current_transformer',
        label: 'Current transformer',
        icon: <FiActivity />,
        detail: 'CT ratio for metering',
      },
      {
        type: 'voltage_transformer',
        label: 'Voltage transformer',
        icon: <FiActivity />,
        detail: 'Potential transformer (VT)',
      },
      {
        type: 'din_rail',
        label: 'DIN rail',
        icon: <FiSliders />,
        detail: 'Panel mounting rail',
      },
      {
        type: 'mounting_plate',
        label: 'Mounting plate',
        icon: <FiSliders />,
        detail: 'Equipment backplate / chassis',
      },
      {
        type: 'cable_duct',
        label: 'Cable duct',
        icon: <FiLink />,
        detail: 'Wiring trunking / segregation path',
      },
      {
        type: 'busbar_support_insulator',
        label: 'Busbar support',
        icon: <FiShield />,
        detail: 'Insulated busbar support block',
      },
      {
        type: 'ferrule_cable_markers',
        label: 'Ferrules & markers',
        icon: <FiLink />,
        detail: 'Cable-end ferrules and wire IDs',
      },
      {
        type: 'control_wiring',
        label: 'Control wiring',
        icon: <FiLink />,
        detail: 'Flexible Cu (e.g. H07V-K), often 0.5–1.5 mm² in panels',
      },
      {
        type: 'power_cables',
        label: 'Power cables',
        icon: <FiLink />,
        detail: 'Load-sized feeder/power cabling',
      },
      {
        type: 'ms_gi_sheet_enclosure',
        label: 'MS/GI sheet enclosure',
        icon: <FiBox />,
        detail: 'Sheet-metal panel body/chassis',
      },
      {
        type: 'ip_rated_enclosure',
        label: 'IP rated enclosure',
        icon: <FiBox />,
        detail: 'Panel housing IP54/IP65',
      },
      {
        type: 'power_quality_analyzer',
        label: 'Power quality analyzer',
        icon: <FiActivity />,
        detail: 'Harmonics/events monitoring',
      },
    ],
  },
  {
    name: 'Outlets',
    emoji: '🔌',
    items: [
      {
        type: 'socket',
        label: 'Socket',
        icon: <FiCircle />,
        detail: 'Schuko · rating in properties',
      },
    ],
  },
  {
    name: 'Loads',
    emoji: '💡',
    items: [
      { type: 'lamp', label: 'Lamp', icon: <FiSun />, detail: 'Power in properties' },
      { type: 'motor', label: 'Motor', icon: <FiActivity />, detail: '1φ · power in properties' },
      {
        type: 'three_phase_motor',
        label: '3φ Motor',
        icon: <FiActivity />,
        detail: 'Wye · power in properties',
      },
      { type: 'heater', label: 'Heater', icon: <FiSun />, detail: 'Power in properties' },
      {
        type: 'panel_heater',
        label: 'Panel heater',
        icon: <FiSun />,
        detail: 'Anti-condensation enclosure heater',
      },
      {
        type: 'cooling_fan',
        label: 'Cooling fan',
        icon: <FiActivity />,
        detail: 'Panel ventilation / heat removal',
      },
      { type: 'generic_load', label: 'Generic load', icon: <FiCircle /> },
    ],
  },
  {
    name: 'Wiring',
    emoji: '🔗',
    items: [
      { type: 'junction', label: 'Junction Point', icon: <FiLink /> },
      {
        type: 'connection_point',
        label: 'Connection point',
        icon: <FiLink />,
        detail: 'Tap on a wire — splices automatically',
      },
      { type: 'terminal_block', label: 'Terminal block', icon: <FiLink />, detail: 'Pass-through terminal (IN/OUT)' },
    ],
  },
];

const ALL_PALETTE_TYPES: ReadonlySet<string> = new Set(
  GROUPS.flatMap((g) => g.items.map((i) => i.type))
);

const TYPE_TO_GROUP = new Map<string, string>();
for (const g of GROUPS) {
  for (const it of g.items) {
    if (!TYPE_TO_GROUP.has(it.type)) TYPE_TO_GROUP.set(it.type, g.name);
  }
}

const ITEM_BY_TYPE = new Map<ComponentType, ComponentItem>();
for (const g of GROUPS) {
  for (const it of g.items) {
    if (!ITEM_BY_TYPE.has(it.type)) ITEM_BY_TYPE.set(it.type, it);
  }
}

function loadCollapsed(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((s) => typeof s === 'string'));
    }
  } catch {
    // ignore corrupt storage
  }
  return new Set();
}

function saveCollapsed(set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      COLLAPSE_STORAGE_KEY,
      JSON.stringify(Array.from(set))
    );
  } catch {
    // storage may be disabled (e.g. private mode); failure is non-fatal
  }
}

function readBoolLocalStorage(key: string): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch {
    // ignore corrupt storage
  }
  return null;
}

function writeBoolLocalStorage(key: string, open: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, open ? 'true' : 'false');
  } catch {
    // storage may be disabled; failure is non-fatal
  }
}

function loadSearchPanelOpen(): boolean {
  const own = readBoolLocalStorage(PALETTE_SEARCH_PANEL_KEY);
  if (own !== null) return own;
  const legacy = readBoolLocalStorage(LEGACY_PALETTE_BODY_KEY);
  if (legacy !== null) return legacy;
  return true;
}

function saveSearchPanelOpen(open: boolean): void {
  writeBoolLocalStorage(PALETTE_SEARCH_PANEL_KEY, open);
}

function loadComponentListOpen(): boolean {
  const own = readBoolLocalStorage(PALETTE_COMPONENT_LIST_KEY);
  if (own !== null) return own;
  const legacy = readBoolLocalStorage(LEGACY_PALETTE_BODY_KEY);
  if (legacy !== null) return legacy;
  return true;
}

function saveComponentListOpen(open: boolean): void {
  writeBoolLocalStorage(PALETTE_COMPONENT_LIST_KEY, open);
}

type SidebarSection = {
  collapseKey: string;
  name: string;
  emoji: string;
  items: ComponentItem[];
};

const Sidebar: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const darkSurface = isDarkSurface(theme);
  const setPendingInsertType = useUiStore((s) => s.setPendingInsertType);
  const paletteListRef = useRef<HTMLDivElement>(null);
  const [focusedPaletteIndex, setFocusedPaletteIndex] = useState(-1);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => loadCollapsed());
  const [searchPanelOpen, setSearchPanelOpen] = useState(() =>
    loadSearchPanelOpen()
  );
  const [componentListOpen, setComponentListOpen] = useState(() =>
    loadComponentListOpen()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [favorites, setFavorites] = useState<string[]>(() =>
    loadFavoriteTypes(ALL_PALETTE_TYPES)
  );

  useEffect(() => {
    saveCollapsed(collapsed);
  }, [collapsed]);

  useEffect(() => {
    saveSearchPanelOpen(searchPanelOpen);
  }, [searchPanelOpen]);

  useEffect(() => {
    saveComponentListOpen(componentListOpen);
  }, [componentListOpen]);

  const filteredSections: SidebarSection[] = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matches = (item: ComponentItem) => {
      if (!q) return true;
      const blob = `${item.label} ${item.detail ?? ''} ${item.type}`.toLowerCase();
      return blob.includes(q);
    };
    const catOk = (item: ComponentItem) =>
      categoryFilter === 'all' || TYPE_TO_GROUP.get(item.type) === categoryFilter;

    const out: SidebarSection[] = [];

    const favItems = favorites
      .map((t) => ITEM_BY_TYPE.get(t as ComponentType))
      .filter((x): x is ComponentItem => !!x)
      .filter(matches)
      .filter(catOk);
    if (favItems.length > 0) {
      out.push({
        collapseKey: 'Favorites',
        name: 'Favorites',
        emoji: '⭐',
        items: favItems,
      });
    }

    for (const g of GROUPS) {
      if (categoryFilter !== 'all' && g.name !== categoryFilter) continue;
      // Always list every type in its home group so you can place the same
      // part many times; Favorites are an extra shortcut (may duplicate).
      const items = g.items.filter(matches).filter(catOk);
      if (items.length === 0) continue;
      out.push({
        collapseKey: g.name,
        name: g.name,
        emoji: g.emoji,
        items,
      });
    }

    return out;
  }, [searchQuery, categoryFilter, favorites]);

  const visiblePaletteItems = useMemo(() => {
    const out: { item: ComponentItem; sectionKey: string; optionId: string }[] =
      [];
    for (const section of filteredSections) {
      if (collapsed.has(section.collapseKey)) continue;
      section.items.forEach((item, idx) => {
        out.push({
          item,
          sectionKey: section.collapseKey,
          optionId: `palette-opt-${section.collapseKey}-${item.type}-${idx}`,
        });
      });
    }
    return out;
  }, [filteredSections, collapsed]);

  const safeFocusedPaletteIndex =
    focusedPaletteIndex >= visiblePaletteItems.length
      ? visiblePaletteItems.length > 0
        ? visiblePaletteItems.length - 1
        : -1
      : focusedPaletteIndex;

  const handlePaletteKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const count = visiblePaletteItems.length;
    if (count === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedPaletteIndex((i) => (i < 0 ? 0 : Math.min(count - 1, i + 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedPaletteIndex((i) => (i < 0 ? count - 1 : Math.max(0, i - 1)));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setFocusedPaletteIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setFocusedPaletteIndex(count - 1);
      return;
    }
    if (e.key === 'Enter' && safeFocusedPaletteIndex >= 0) {
      e.preventDefault();
      const entry = visiblePaletteItems[safeFocusedPaletteIndex];
      if (entry) {
        setPendingInsertType(entry.item.type);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setFocusedPaletteIndex(-1);
      setPendingInsertType(null);
    }
  };

  const toggleGroup = (name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const expandAllGroups = React.useCallback(() => {
    setCollapsed(new Set());
  }, []);

  const collapseAllGroups = React.useCallback(() => {
    setCollapsed(new Set(filteredSections.map((s) => s.collapseKey)));
  }, [filteredSections]);

  const handleDragStart = (e: React.DragEvent, item: ComponentItem) => {
    setDragComponentType(item.type);
    e.dataTransfer.setData('componentType', item.type);
    e.dataTransfer.setData('text/plain', item.type);
    if (item.type === 'push_button') {
      e.dataTransfer.setData('pushButtonVariant', 'NO');
    } else {
      e.dataTransfer.setData('pushButtonVariant', '');
    }
    if (item.type === 'mcb' && item.mcbInitialPoles === 2) {
      e.dataTransfer.setData('mcbInitialPoles', '2');
    } else {
      e.dataTransfer.setData('mcbInitialPoles', '');
    }
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    clearDragComponentType();
  };

  const renderPaletteRow = (
    item: ComponentItem,
    idx: number,
    sectionKey: string,
    optionId: string,
    isFocused: boolean
  ) => {
    const isFav = favorites.includes(item.type);
    return (
      <div
        key={`${sectionKey}-${item.type}-${idx}`}
        id={optionId}
        role="option"
        aria-selected={isFocused}
        tabIndex={-1}
        draggable
        onDragStart={(e) => handleDragStart(e, item)}
        onDragEnd={handleDragEnd}
        onFocus={() => {
          const flatIdx = visiblePaletteItems.findIndex((v) => v.optionId === optionId);
          if (flatIdx >= 0) setFocusedPaletteIndex(flatIdx);
        }}
        title={formatComponentPanelHelpText(
          COMPONENT_PANEL_DESCRIPTIONS[item.type]
        )}
        className={`flex items-center gap-2 px-3 py-1.5 mx-1 rounded cursor-grab ${tc.itemHover} transition-colors active:cursor-grabbing focus:outline-none ${
          isFocused ? 'ring-2 ring-blue-500 ring-inset' : ''
        }`}
      >
        <span className={`text-sm shrink-0 ${tc.groupLabel}`}>{item.icon}</span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={`text-[11px] leading-tight ${tc.text}`}>{item.label}</span>
          {item.detail && (
            <span className={`text-[9px] leading-tight ${tc.textMuted}`}>{item.detail}</span>
          )}
        </div>
        <button
          type="button"
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          className={`shrink-0 rounded p-1 ${tc.itemHover}`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setFavorites((cur) =>
              toggleFavoriteType(item.type, cur, ALL_PALETTE_TYPES)
            );
          }}
        >
          <FiStar
            className={`h-3.5 w-3.5 ${
              isFav ? 'fill-amber-400 text-amber-400' : `opacity-35 ${tc.textMuted}`
            }`}
            strokeWidth={isFav ? 0 : 1.75}
          />
        </button>
      </div>
    );
  };

  let paletteRowCounter = 0;

  return (
    <div
      id="sidebar-palette-root"
      className={`w-56 ${tc.sidebar} ${tc.text} flex min-h-0 flex-col select-none border-r ${tc.border}`}
    >
      <div className={`shrink-0 border-b ${tc.border} ${tc.sidebar}`}>
        <div className={`px-3 py-2 flex items-center justify-between gap-2`}>
          <h2
            id="sidebar-palette-heading"
            className={`text-xs font-bold ${tc.textBright} tracking-wide min-w-0 truncate`}
          >
            Components
          </h2>
          <div
            className="flex shrink-0 gap-0.5 rounded-md border border-black/10 dark:border-white/10 p-0.5"
            role="group"
            aria-label="Expand or collapse all component groups"
          >
            <button
              type="button"
              title="Expand all groups"
              disabled={!componentListOpen || filteredSections.length === 0}
              onClick={expandAllGroups}
              className={`rounded p-1.5 transition-colors disabled:opacity-30 disabled:pointer-events-none ${tc.itemHover} ${tc.textMuted} hover:${tc.text}`}
            >
              <FiChevronsDown className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              title="Collapse all groups"
              disabled={!componentListOpen || filteredSections.length === 0}
              onClick={collapseAllGroups}
              className={`rounded p-1.5 transition-colors disabled:opacity-30 disabled:pointer-events-none ${tc.itemHover} ${tc.textMuted} hover:${tc.text}`}
            >
              <FiChevronsUp className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className={`border-t border-black/10 dark:border-white/10`}>
          <button
            type="button"
            onClick={() => setSearchPanelOpen((o) => !o)}
            aria-expanded={searchPanelOpen}
            aria-controls={
              searchPanelOpen ? 'sidebar-search-panel' : undefined
            }
            title={
              searchPanelOpen
                ? 'Hide search and category filters'
                : 'Show search and category filters'
            }
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide ${tc.groupLabel} ${tc.itemHover} transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-inset`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${theme === 'dark' ? 'bg-white/10' : 'bg-black/[0.06]'} text-[11px] ${tc.textMuted}`}
              aria-hidden
            >
              {searchPanelOpen ? (
                <FiChevronDown className="h-3.5 w-3.5" />
              ) : (
                <FiChevronRight className="h-3 w-3" />
              )}
            </span>
            <span id="sidebar-search-panel-heading" className="min-w-0 truncate">
              Search & filters
            </span>
          </button>
          {searchPanelOpen && (
            <div
              id="sidebar-search-panel"
              role="region"
              aria-labelledby="sidebar-search-panel-heading"
              className={`space-y-2 px-3 pb-2 pt-0.5`}
            >
              <label className="sr-only" htmlFor="sidebar-component-search">
                Search components
              </label>
              <div className="relative">
                <FiSearch
                  className={`pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${tc.textMuted}`}
                  aria-hidden
                />
                <input
                  id="sidebar-component-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`input-field w-full py-1 pl-7 text-[11px] ${theme === 'dark' ? 'bg-black/25' : ''}`}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-colors ${
                    categoryFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : `${tc.textMuted} ${theme === 'dark' ? 'bg-white/10' : 'bg-black/[0.06]'}`
                  }`}
                >
                  All
                </button>
                {GROUPS.map((g) => (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => setCategoryFilter(g.name)}
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-colors ${
                      categoryFilter === g.name
                        ? 'bg-blue-600 text-white'
                        : `${tc.textMuted} ${theme === 'dark' ? 'bg-white/10' : 'bg-black/[0.06]'}`
                    }`}
                  >
                    {g.emoji} {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={() => setComponentListOpen((o) => !o)}
            aria-expanded={componentListOpen}
            aria-controls={
              componentListOpen ? 'sidebar-palette-body' : undefined
            }
            title={
              componentListOpen
                ? 'Hide component list'
                : 'Show component list'
            }
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide ${tc.groupLabel} ${tc.itemHover} transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-inset`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${theme === 'dark' ? 'bg-white/10' : 'bg-black/[0.06]'} text-[10px] ${tc.textMuted}`}
              aria-hidden
            >
              {componentListOpen ? (
                <FiChevronDown className="h-3 w-3" />
              ) : (
                <FiChevronRight className="h-3 w-3" />
              )}
            </span>
            <span id="sidebar-component-list-heading" className="min-w-0 truncate">
              Component list
            </span>
          </button>
        </div>
      </div>
      {componentListOpen && (
      <div
        ref={paletteListRef}
        id="sidebar-palette-body"
        role="listbox"
        aria-label="Component palette"
        aria-labelledby="sidebar-component-list-heading"
        aria-activedescendant={
          focusedPaletteIndex >= 0
            ? visiblePaletteItems[focusedPaletteIndex]?.optionId
            : undefined
        }
        tabIndex={0}
        onKeyDown={handlePaletteKeyDown}
        onFocus={() => {
          if (focusedPaletteIndex < 0 && visiblePaletteItems.length > 0) {
            setFocusedPaletteIndex(0);
          }
        }}
        className="min-h-0 flex-1 overflow-y-auto py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-inset"
      >
        {filteredSections.length === 0 ? (
          <p className={`px-3 py-4 text-center text-[10px] ${tc.textMuted}`}>
            No components match this search or category.
          </p>
        ) : (
          filteredSections.map((section) => {
            const isCollapsed = collapsed.has(section.collapseKey);
            return (
              <div
                key={section.collapseKey}
                className={`mb-1 mx-1 rounded-lg border ${
                  isCollapsed
                    ? 'border-transparent'
                    : `${tc.border} ${darkSurface ? 'bg-black/20' : 'bg-black/[0.03]'}`
                } overflow-hidden`}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(section.collapseKey)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`sidebar-group-${section.collapseKey}`}
                  title={
                    isCollapsed
                      ? `Expand ${section.name} (${section.items.length})`
                      : `Collapse ${section.name}`
                  }
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold ${tc.groupLabel} uppercase tracking-wider ${tc.itemHover} transition-colors text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-inset`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${theme === 'dark' ? 'bg-white/10' : 'bg-black/[0.06]'} text-[10px]`}
                    aria-hidden
                  >
                    {isCollapsed ? <FiChevronRight /> : <FiChevronDown />}
                  </span>
                  <span className="min-w-0 truncate text-left">
                    <span className="mr-1" aria-hidden>
                      {section.emoji}
                    </span>
                    {section.name}
                  </span>
                  <span
                    className={`ml-auto shrink-0 tabular-nums text-[9px] ${tc.textMuted} normal-case font-normal`}
                  >
                    {section.items.length}
                  </span>
                </button>
                {!isCollapsed && (
                  <div
                    id={`sidebar-group-${section.collapseKey}`}
                    className={`border-t ${tc.border} pb-1`}
                  >
                    {section.items.map((item, idx) => {
                      const entry = visiblePaletteItems[paletteRowCounter];
                      const optionId = entry?.optionId ?? `palette-opt-${section.collapseKey}-${item.type}-${idx}`;
                      const isFocused =
                        paletteRowCounter === safeFocusedPaletteIndex;
                      paletteRowCounter += 1;
                      return renderPaletteRow(
                        item,
                        idx,
                        section.collapseKey,
                        optionId,
                        isFocused
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      )}
    </div>
  );
};

export default Sidebar;
