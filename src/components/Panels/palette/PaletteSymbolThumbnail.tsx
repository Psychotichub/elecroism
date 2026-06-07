import React from 'react';
import type { ComponentType } from '../../../types';
import { inferComponentDrawingLayer } from '../../../utils/drawingLayers';
import { sldTypeAbbreviation } from '../../../utils/sldView';

type Props = {
  type: ComponentType;
  className?: string;
};

const LAYER_STROKE: Record<string, string> = {
  power: '#DC2626',
  control: '#2563EB',
  instrumentation: '#7C3AED',
};

const LAYER_FILL: Record<string, string> = {
  power: 'rgba(220,38,38,0.18)',
  control: 'rgba(37,99,235,0.18)',
  instrumentation: 'rgba(124,58,237,0.18)',
};

const PaletteSymbolThumbnail: React.FC<Props> = ({ type, className = '' }) => {
  const layer = inferComponentDrawingLayer(type);
  const stroke = LAYER_STROKE[layer] ?? LAYER_STROKE.power;
  const fill = LAYER_FILL[layer] ?? LAYER_FILL.power;
  const abbr = sldTypeAbbreviation(type);

  if (type === 'busbar' || type === 'busbar_system') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`es-palette-symbol-thumb ${className}`}
        aria-hidden
      >
        <rect x="3" y="10" width="18" height="4" rx="1" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
      </svg>
    );
  }

  if (type === 'junction' || type === 'connection_point') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`es-palette-symbol-thumb ${className}`}
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" fill={stroke} />
      </svg>
    );
  }

  const fontSize = abbr.length > 4 ? 5.5 : abbr.length > 3 ? 6.5 : 7.5;

  return (
    <svg
      viewBox="0 0 24 24"
      className={`es-palette-symbol-thumb ${className}`}
      aria-hidden
    >
      <rect
        x="4"
        y="6"
        width="16"
        height="12"
        rx="2"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.2"
      />
      <text
        x="12"
        y="13.5"
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="700"
        fill={stroke}
        fontFamily="system-ui, sans-serif"
      >
        {abbr.slice(0, 6)}
      </text>
    </svg>
  );
};

export default PaletteSymbolThumbnail;
