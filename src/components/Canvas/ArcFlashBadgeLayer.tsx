import React, { useMemo } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { Circuit, SimulationResult } from '../../types';
import { buildArcFlashReport } from '../../utils/arcFlashAnalysis';

type Props = {
  circuit: Circuit;
  simulationResult: SimulationResult | null;
  panX: number;
  panY: number;
  zoom: number;
  /** When set, only draw badges for components in the visible set. */
  visibleComponentIds?: ReadonlySet<string>;
};

const ArcFlashBadgeLayer: React.FC<Props> = ({
  circuit,
  simulationResult,
  panX,
  panY,
  zoom,
  visibleComponentIds,
}) => {
  const badges = useMemo(() => {
    return buildArcFlashReport(circuit, simulationResult)
      .filter((r) => r.incidentEnergyCalCm2 >= 4)
      .filter(
        (r) =>
          !visibleComponentIds || visibleComponentIds.has(r.deviceId)
      )
      .map((r) => {
        const comp = circuit.components.find((c) => c.id === r.deviceId);
        if (!comp) return null;
        return {
          id: r.deviceId,
          x: comp.x,
          y: comp.y - 42,
          cat: r.ppeCategory,
          e: r.incidentEnergyCalCm2,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b != null);
  }, [circuit, simulationResult, visibleComponentIds]);

  if (badges.length === 0) return null;

  return (
    <Group listening={false} x={panX} y={panY} scaleX={zoom} scaleY={zoom}>
      {badges.map((b) => {
        const fill =
          b.cat === '4'
            ? '#7f1d1d'
            : b.cat === '3'
              ? '#b45309'
              : b.cat === '2'
                ? '#ca8a04'
                : '#854d0e';
        const w = 52;
        const h = 18;
        return (
          <Group key={b.id} x={b.x - w / 2} y={b.y}>
            <Rect
              width={w}
              height={h}
              fill={fill}
              cornerRadius={3}
              opacity={0.92}
            />
            <Text
              text={`⚡Cat ${b.cat}`}
              width={w}
              height={h}
              align="center"
              verticalAlign="middle"
              fontSize={9}
              fontStyle="bold"
              fill="#fff"
            />
          </Group>
        );
      })}
    </Group>
  );
};

export default ArcFlashBadgeLayer;
