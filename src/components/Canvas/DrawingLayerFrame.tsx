import React, { useMemo } from 'react';
import { Group, Rect } from 'react-konva';
import type { DrawingLayerId } from '../../types';
import { useDrawingLayerStore } from '../../store/drawingLayerStore';
import { connectionPointWorld } from '../../utils/geometry';
import type { CircuitComponent } from '../../types';

type Props = {
  layerId: DrawingLayerId;
  component?: CircuitComponent;
  children: React.ReactNode;
};

const DrawingLayerFrame: React.FC<Props> = ({ layerId, component, children }) => {
  const layer = useDrawingLayerStore((s) => s.getLayer(layerId));
  const selectable = useDrawingLayerStore((s) => s.isLayerSelectable(layerId));

  const bounds = useMemo(() => {
    if (!component) return null;
    const pts = component.connectionPoints.map((cp) =>
      connectionPointWorld(component, cp)
    );
    pts.push({ x: component.x, y: component.y });
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const pad = 14;
    return {
      x: Math.min(...xs) - pad,
      y: Math.min(...ys) - pad,
      width: Math.max(...xs) - Math.min(...xs) + pad * 2,
      height: Math.max(...ys) - Math.min(...ys) + pad * 2,
    };
  }, [component]);

  if (!layer.visible) return null;

  return (
    <Group
      visible={layer.visible}
      listening={selectable}
      drawingLayer={layerId}
    >
      {layer.colorWash && bounds ? (
        <Rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          fill={layer.washColor}
          listening={false}
        />
      ) : null}
      {children}
    </Group>
  );
};

export default DrawingLayerFrame;
