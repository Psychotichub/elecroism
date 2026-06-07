import type { ComponentMacro } from './componentMacros';
import { buildLibraryPack, type ComponentLibraryPack } from './componentLibraryPack';

function macro(
  id: string,
  name: string,
  components: ComponentMacro['components'],
  wires: ComponentMacro['wires'] = [],
  extra?: Partial<ComponentMacro>
): ComponentMacro {
  return {
    id,
    name,
    createdAt: '2026-06-07T00:00:00.000Z',
    updatedAt: '2026-06-07T00:00:00.000Z',
    components,
    wires,
    ...extra,
  };
}

function mcb(id: string, label: string, rating: number): ComponentMacro['components'][0] {
  return {
    id,
    type: 'mcb',
    label,
    x: 0,
    y: 0,
    rotation: 0,
    state: 'on',
    selected: false,
    connectionPoints: [
      { id: `${id}-p1`, componentId: id, label: '1', x: -20, y: 0 },
      { id: `${id}-p2`, componentId: id, label: '2', x: 20, y: 0 },
    ],
    properties: { ratingAmps: rating, phaseSystem: 'single_phase' },
  };
}

function contactor(id: string, label: string): ComponentMacro['components'][0] {
  return {
    id,
    type: 'contactor',
    label,
    x: 80,
    y: 0,
    rotation: 0,
    state: 'off',
    selected: false,
    connectionPoints: [
      { id: `${id}-a1`, componentId: id, label: 'A1', x: -20, y: -8 },
      { id: `${id}-a2`, componentId: id, label: 'A2', x: 20, y: -8 },
      { id: `${id}-coil`, componentId: id, label: 'COIL', x: 0, y: 18 },
    ],
    properties: { coilVoltageV: 230, phaseSystem: 'single_phase' },
  };
}

function diModule(id: string, label: string): ComponentMacro['components'][0] {
  return {
    id,
    type: 'di_module',
    label,
    x: 0,
    y: 0,
    rotation: 0,
    state: 'on',
    selected: false,
    connectionPoints: [
      { id: `${id}-com`, componentId: id, label: 'COM', x: -24, y: 0 },
      { id: `${id}-in1`, componentId: id, label: 'IN1', x: 0, y: -12 },
      { id: `${id}-in2`, componentId: id, label: 'IN2', x: 0, y: 12 },
    ],
    properties: { diCount: 8 },
  };
}

function aiModule(id: string, label: string): ComponentMacro['components'][0] {
  return {
    id,
    type: 'ai_module',
    label,
    x: 0,
    y: 0,
    rotation: 0,
    state: 'on',
    selected: false,
    connectionPoints: [
      { id: `${id}-pwr`, componentId: id, label: '24V', x: -24, y: 0 },
      { id: `${id}-ai1`, componentId: id, label: 'AI1', x: 8, y: -12 },
      { id: `${id}-ai2`, componentId: id, label: 'AI2', x: 8, y: 12 },
    ],
    properties: { aiCount: 4 },
  };
}

const iecSymbolsPack = buildLibraryPack(
  [
    macro('iec-mcb-16', 'IEC MCB 16 A', [mcb('c-mcb16', 'Q1', 16)], [], {
      description: 'Single-pole MCB template with IEC-style tag',
      tags: ['iec', 'protection'],
    }),
    macro('iec-mcb-32', 'IEC MCB 32 A', [mcb('c-mcb32', 'Q2', 32)], [], {
      description: '32 A feeder breaker template',
      tags: ['iec', 'protection'],
    }),
    macro('iec-contactor', 'IEC Contactor K1', [contactor('c-k1', 'K1')], [], {
      description: 'Three-pole contactor with coil terminal',
      tags: ['iec', 'control'],
    }),
  ],
  'IEC Symbols Starter',
  {
    author: 'ElectroSim',
    description: 'Common IEC-style device templates for panel drawings.',
  }
);

const motorStartersPack = buildLibraryPack(
  [
    macro(
      'dol-starter',
      'DOL starter (MCB + K)',
      [mcb('dol-q', 'Q-M', 25), contactor('dol-k', 'K-M')],
      [
        {
          id: 'w-dol-1',
          fromComponentId: 'dol-q',
          fromPointId: 'dol-q-p2',
          toComponentId: 'dol-k',
          toPointId: 'dol-k-a1',
          points: [20, 0, 60, -8],
          color: 'brown',
          crossSection: 2.5,
          energized: false,
          currentAmps: 0,
        },
      ],
      {
        description: 'Direct-on-line motor feeder with breaker and contactor',
        tags: ['motor', 'starter', 'dol'],
      }
    ),
    macro('motor-mcb', 'Motor circuit MCB', [mcb('mot-q', 'Q-MOT', 40)], [], {
      description: 'Dedicated motor protection breaker',
      tags: ['motor', 'protection'],
    }),
  ],
  'Motor Starters Starter',
  {
    author: 'ElectroSim',
    description: 'DOL and motor protection macros for starter circuits.',
  }
);

const bmsIoPack = buildLibraryPack(
  [
    macro('bms-di-8', 'BMS DI module 8ch', [diModule('bms-di', 'DI-01')], [], {
      description: 'Digital input module with COM and channel terminals',
      tags: ['bms', 'di'],
    }),
    macro('bms-ai-4', 'BMS AI module 4ch', [aiModule('bms-ai', 'AI-01')], [], {
      description: 'Analog input module for 0–10 V / 4–20 mA signals',
      tags: ['bms', 'ai'],
    }),
    macro(
      'bms-io-pair',
      'BMS I/O pair (DI + AI)',
      [diModule('pair-di', 'DI-02'), aiModule('pair-ai', 'AI-02')],
      [],
      {
        description: 'Typical field I/O pair for a BMS controller rack',
        tags: ['bms', 'io'],
      }
    ),
  ],
  'BMS I/O Starter',
  {
    author: 'ElectroSim',
    description: 'Digital and analog BMS I/O module templates.',
  }
);

export const CURATED_LIBRARY_PACKS: Record<string, ComponentLibraryPack> = {
  'iec-symbols-starter': iecSymbolsPack,
  'motor-starters-starter': motorStartersPack,
  'bms-io-starter': bmsIoPack,
};

export function getCuratedLibraryPack(
  packId: string
): ComponentLibraryPack | null {
  return CURATED_LIBRARY_PACKS[packId] ?? null;
}
