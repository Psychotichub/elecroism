import type { Wire, WireStyleLayer } from '../types';
import { getWireWidth } from './geometry';

export const WIRE_STYLE_LAYER_OPTIONS: {
  value: WireStyleLayer;
  label: string;
}[] = [
  { value: 'power_ac', label: 'Power AC' },
  { value: 'power_dc', label: 'Power DC' },
  { value: 'control_ac', label: 'Control AC' },
  { value: 'control_dc', label: 'Control DC' },
  { value: 'earth_pe', label: 'Earth / PE' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'communication', label: 'Communication' },
  { value: 'instrumentation_analog', label: 'Instrumentation (analog)' },
];

type RenderKind = 'earth_pe' | 'neutral' | 'comm' | 'plain';

type Spec = {
  render: RenderKind;
  widthMultiplier: number;
  stroke: string;
  stroke2?: string;
  dash?: number[];
  commMark?: string;
  defaultWireColor: Wire['color'];
  defaultWireCategory: NonNullable<Wire['wireCategory']>;
  defaultWireProtocol?: Wire['wireProtocol'];
  suggestedCrossSection?: number;
};

const SPECS: Record<WireStyleLayer, Spec> = {
  power_ac: {
    render: 'plain',
    widthMultiplier: 1.05,
    stroke: '#7C3F19',
    defaultWireColor: 'brown',
    defaultWireCategory: 'power',
    suggestedCrossSection: 2.5,
  },
  power_dc: {
    render: 'plain',
    widthMultiplier: 1.08,
    stroke: '#B91C1C',
    dash: [14, 5],
    defaultWireColor: 'red',
    defaultWireCategory: 'power',
    suggestedCrossSection: 2.5,
  },
  control_ac: {
    render: 'plain',
    widthMultiplier: 0.95,
    stroke: '#111827',
    defaultWireColor: 'black',
    defaultWireCategory: 'control',
    suggestedCrossSection: 1.5,
  },
  control_dc: {
    render: 'plain',
    widthMultiplier: 0.95,
    stroke: '#4B5563',
    dash: [8, 5],
    defaultWireColor: 'grey',
    defaultWireCategory: 'control',
    suggestedCrossSection: 1.5,
  },
  earth_pe: {
    render: 'earth_pe',
    widthMultiplier: 1,
    stroke: '#EAB308',
    stroke2: '#15803D',
    defaultWireColor: 'green_yellow',
    defaultWireCategory: 'power',
    suggestedCrossSection: 2.5,
  },
  neutral: {
    render: 'neutral',
    widthMultiplier: 1,
    stroke: '#2563EB',
    defaultWireColor: 'blue',
    defaultWireCategory: 'power',
    suggestedCrossSection: 2.5,
  },
  communication: {
    render: 'comm',
    widthMultiplier: 0.95,
    stroke: '#0891B2',
    dash: [10, 6],
    commMark: 'COM',
    defaultWireColor: 'ethernet',
    defaultWireCategory: 'comm',
    defaultWireProtocol: 'ethernet',
    suggestedCrossSection: 1.5,
  },
  instrumentation_analog: {
    render: 'plain',
    widthMultiplier: 0.88,
    stroke: '#9333EA',
    dash: [3, 3, 10, 3],
    defaultWireColor: 'grey',
    defaultWireCategory: 'control',
    suggestedCrossSection: 1.5,
  },
};

export function applyWireStyleLayerDefaults(
  layer: WireStyleLayer
): Pick<Wire, 'styleLayer' | 'color' | 'wireCategory' | 'wireProtocol'> {
  const s = SPECS[layer];
  return {
    styleLayer: layer,
    color: s.defaultWireColor,
    wireCategory: s.defaultWireCategory,
    wireProtocol: s.defaultWireProtocol ?? 'none',
  };
}

/** Suggested cross-section (mm²) for documentation; not auto-applied. */
export function suggestedCrossSectionForLayer(
  layer: WireStyleLayer
): number | undefined {
  return SPECS[layer].suggestedCrossSection;
}

export function parseWireStyleLayerArg(
  raw: string | undefined
): WireStyleLayer | null {
  if (!raw) return null;
  const k = raw.toLowerCase().replace(/-/g, '_') as WireStyleLayer;
  return k in SPECS ? k : null;
}

export type WireSegmentVisual =
  | {
      kind: 'earth_pe';
      strokeWidth: number;
      stroke1: string;
      stroke2: string;
      dash: number[];
    }
  | {
      kind: 'neutral';
      strokeWidth: number;
      main: string;
      accent: string;
    }
  | {
      kind: 'comm';
      strokeWidth: number;
      stroke: string;
      dash: number[];
      mark: string;
      mid: { x: number; y: number } | null;
    }
  | {
      kind: 'plain';
      strokeWidth: number;
      stroke: string;
      dash?: number[];
    };

function segmentMid(points: number[]): { x: number; y: number } | null {
  const pairCount = Math.floor(points.length / 2);
  if (pairCount < 2) return null;
  const i1 = Math.max(0, Math.floor((pairCount - 1) / 2));
  const i2 = Math.min(pairCount - 1, i1 + 1);
  const x1 = points[i1 * 2];
  const y1 = points[i1 * 2 + 1];
  const x2 = points[i2 * 2];
  const y2 = points[i2 * 2 + 1];
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

/** Konva stroke preview for a wire (style layer or legacy conductor color). */
export function resolveWireSegmentVisual(
  wire: Wire,
  selected: boolean
): WireSegmentVisual {
  const baseW = getWireWidth(wire.crossSection);
  const sel = selected ? 1 : 0;

  if (wire.styleLayer) {
    const s = SPECS[wire.styleLayer];
    const strokeW = Math.max(0.65, baseW * s.widthMultiplier) + sel;
    if (s.render === 'earth_pe') {
      return {
        kind: 'earth_pe',
        strokeWidth: strokeW,
        stroke1: s.stroke,
        stroke2: s.stroke2 ?? '#15803D',
        dash: [9, 7],
      };
    }
    if (s.render === 'neutral') {
      return {
        kind: 'neutral',
        strokeWidth: strokeW,
        main: s.stroke,
        accent: '#93C5FD',
      };
    }
    if (s.render === 'comm') {
      return {
        kind: 'comm',
        strokeWidth: strokeW,
        stroke: s.stroke,
        dash: s.dash ?? [10, 6],
        mark: s.commMark ?? 'COM',
        mid: segmentMid(wire.points),
      };
    }
    return {
      kind: 'plain',
      strokeWidth: strokeW,
      stroke: s.stroke,
      dash: s.dash,
    };
  }

  const strokeW = baseW + sel;
  if (wire.color === 'green_yellow') {
    return {
      kind: 'earth_pe',
      strokeWidth: strokeW,
      stroke1: '#EAB308',
      stroke2: '#15803D',
      dash: [9, 7],
    };
  }
  if (wire.color === 'blue') {
    return {
      kind: 'neutral',
      strokeWidth: strokeW,
      main: '#2563EB',
      accent: '#93C5FD',
    };
  }
  if (wire.color === 'ethernet') {
    return {
      kind: 'comm',
      strokeWidth: strokeW,
      stroke: '#0891B2',
      dash: [10, 6],
      mark: 'ETH',
      mid: segmentMid(wire.points),
    };
  }

  const colors: Record<string, string> = {
    brown: '#7C3F19',
    blue: '#2563EB',
    green_yellow: '#65A30D',
    black: '#111827',
    grey: '#4B5563',
    red: '#B91C1C',
    ethernet: '#0891B2',
  };
  return {
    kind: 'plain',
    strokeWidth: strokeW,
    stroke: colors[wire.color] || '#1F2937',
  };
}
