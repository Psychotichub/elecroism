import React from 'react';
import { Label } from './PropertyPanelLabel';
import type { DrawingLayerId } from '../../../types';
import {
  DRAWING_LAYER_LABELS,
  DRAWING_LAYER_ORDER,
  inferComponentDrawingLayer,
  inferWireDrawingLayer,
  resolveComponentDrawingLayer,
  resolveWireDrawingLayer,
} from '../../../utils/drawingLayers';
import type { CircuitComponent, Wire } from '../../../types';

type Props = {
  component?: CircuitComponent;
  wire?: Wire;
  onChange: (layer: DrawingLayerId) => void;
  tc: { textMuted: string };
};

export const DrawingLayerField: React.FC<Props> = ({
  component,
  wire,
  onChange,
  tc,
}) => {
  const current =
    component != null
      ? resolveComponentDrawingLayer(component)
      : wire != null
        ? resolveWireDrawingLayer(wire)
        : 'power';
  const inferred =
    component != null
      ? inferComponentDrawingLayer(component.type)
      : wire != null
        ? inferWireDrawingLayer(wire)
        : 'power';
  const explicit =
    component?.drawingLayer ?? wire?.drawingLayer ?? null;

  return (
    <Label text="Drawing layer">
      <select
        className="input-field w-full"
        value={current}
        onChange={(e) => onChange(e.target.value as DrawingLayerId)}
      >
        {DRAWING_LAYER_ORDER.map((id) => (
          <option key={id} value={id}>
            {DRAWING_LAYER_LABELS[id]}
          </option>
        ))}
      </select>
      <p className={`es-typo-caption mt-1 ${tc.textMuted}`}>
        {explicit
          ? 'Explicit layer assignment.'
          : `Inferred from type/style (${DRAWING_LAYER_LABELS[inferred]}).`}
      </p>
    </Label>
  );
};
