import React from 'react';
import { Text } from 'react-konva';
import Konva from 'konva';
import { useCircuitStore } from '../../store/circuitStore';
import { parseCrossSheetReference } from '../../utils/crossSheetNavigation';
import { useSymbolStrokes } from './SymbolRenderContext';

export interface ComponentCanvasLabelProps {
  componentId?: string;
  /** `CircuitComponent.label` — hidden when blank. */
  label: string;
  x: number;
  y: number;
  width: number;
  fontSize?: number;
  fill?: string;
  offsetX?: number;
  offsetY?: number;
}

/** User-editable label on the schematic (same field as Properties → Label). */
export const ComponentCanvasLabel: React.FC<ComponentCanvasLabelProps> = ({
  componentId,
  label,
  x,
  y,
  width,
  fontSize = 7,
  fill = '#6B7280',
  offsetX = 0,
  offsetY = 0,
}) => {
  const { fontSize: scaledFontSize, strokeProps } = useSymbolStrokes();
  const selectedId = useCircuitStore((s) => s.selectedId);
  const gridSize = useCircuitStore((s) => s.circuit.gridSize || 20);
  const updateComponent = useCircuitStore((s) => s.updateComponent);
  const navigateCrossSheetRef = useCircuitStore((s) => s.navigateCrossSheetRef);
  const t = (label ?? '').trim();
  if (!t) return null;

  const crossSheet =
    parseCrossSheetReference(t) ??
    (componentId
      ? (() => {
          const comp = useCircuitStore
            .getState()
            .circuit.components.find((c) => c.id === componentId);
          const ref = comp?.properties.crossSheetRef?.trim();
          return ref ? parseCrossSheetReference(ref) : null;
        })()
      : null);

  const openCrossSheet = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!crossSheet) return;
    e.cancelBubble = true;
    navigateCrossSheetRef(crossSheet.raw);
  };

  return (
    <Text
      text={t}
      x={x + offsetX}
      y={y + offsetY}
      width={width}
      align="center"
      fontSize={scaledFontSize(fontSize)}
      fill={crossSheet ? '#2563EB' : fill}
      fontStyle="bold"
      textDecoration={crossSheet ? 'underline' : undefined}
      stroke="#F9FAFB"
      {...strokeProps(0.35)}
      shadowColor="#111827"
      shadowBlur={1.5}
      shadowOpacity={0.2}
      shadowOffsetY={0.4}
      draggable={!crossSheet}
      onClick={crossSheet ? openCrossSheet : undefined}
      onTap={crossSheet ? openCrossSheet : undefined}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        const targetId = componentId || selectedId;
        if (!targetId) return;
        const comp = useCircuitStore
          .getState()
          .circuit.components.find((c) => c.id === targetId);
        if (!comp) return;
        const snap = (v: number) => {
          const g = Math.max(1, gridSize);
          return Math.round(v / g) * g;
        };
        const nx = snap(e.target.x());
        const ny = snap(e.target.y());
        e.target.x(nx);
        e.target.y(ny);
        updateComponent(targetId, {
          properties: {
            ...comp.properties,
            labelOffsetX: nx - x,
            labelOffsetY: ny - y,
          },
        });
      }}
      ellipsis
    />
  );
};
