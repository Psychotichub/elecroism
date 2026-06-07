import React from 'react';
import { Group, Line } from 'react-konva';
import type { Wire } from '../../types';
import { useDrawingLayerStore } from '../../store/drawingLayerStore';
import { resolveWireDrawingLayer } from '../../utils/drawingLayers';
import { getWireColor } from '../../utils/geometry';
import { sldWireSegment } from '../../utils/sldView';

type Props = {
  wires: Wire[];
  selectedId: string | null;
  onSelectWire: (id: string) => void;
};

const SldWireLayer: React.FC<Props> = ({ wires, selectedId, onSelectWire }) => {
  const isLayerVisible = useDrawingLayerStore((s) => s.isLayerVisible);
  const isLayerSelectable = useDrawingLayerStore((s) => s.isLayerSelectable);

  return (
    <Group listening>
      {wires.map((wire) => {
        const layerId = resolveWireDrawingLayer(wire);
        if (!isLayerVisible(layerId)) return null;
        const selectable = isLayerSelectable(layerId);
        const points = sldWireSegment(wire);
        if (points.length < 4) return null;
        return (
          <Line
            key={wire.id}
            points={points}
            stroke={getWireColor(wire.color)}
            strokeWidth={selectedId === wire.id ? 2.2 : 1.6}
            lineCap="round"
            listening={selectable}
            onClick={() => onSelectWire(wire.id)}
            onTap={() => onSelectWire(wire.id)}
          />
        );
      })}
    </Group>
  );
};

export default SldWireLayer;
