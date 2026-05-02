import React from 'react';
import { Line, Text, Group, Rect } from 'react-konva';
import Konva from 'konva';
import type { Wire } from '../../types';
import {
  effectiveWireDisplayText,
  getLongestWireSegmentLayout,
} from '../../utils/wireLabelLayout';
import { resolveWireSegmentVisual } from '../../utils/wireStyleLayers';

interface Props {
  wire: Wire;
  panX: number;
  panY: number;
  zoom: number;
  /** Circuit-level show wire designators / labels. */
  wireLabelsMasterVisible: boolean;
  onSelect: (world?: { x: number; y: number }) => void;
  selected: boolean;
}

const WireSegment: React.FC<Props> = ({
  wire,
  panX,
  panY,
  zoom,
  wireLabelsMasterVisible,
  onSelect,
  selected,
}) => {
  const vis = resolveWireSegmentVisual(wire, selected);
  const opacity = wire.energized ? 1 : 0.92;
  const labelText = effectiveWireDisplayText(wire);
  const labelLayout = getLongestWireSegmentLayout(wire.points);
  const showWireLabel =
    wireLabelsMasterVisible &&
    wire.labelVisible !== false &&
    labelText.length > 0 &&
    labelLayout !== null &&
    labelLayout.length > 8;

  const pickWorld = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const p = stage?.getPointerPosition();
    return p != null
      ? { x: (p.x - panX) / zoom, y: (p.y - panY) / zoom }
      : undefined;
  };

  const onWireClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect(pickWorld(e));
  };

  const glow =
    vis.kind === 'earth_pe'
      ? wire.energized
        ? '#65A30D'
        : undefined
      : wire.energized
        ? vis.kind === 'neutral'
          ? vis.main
          : vis.kind === 'comm' || vis.kind === 'plain'
            ? vis.stroke
            : undefined
        : undefined;

  return (
    <>
      {vis.kind === 'earth_pe' ? (
        <>
          <Line
            points={wire.points}
            stroke={vis.stroke1}
            strokeWidth={vis.strokeWidth}
            opacity={opacity}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={8}
            onClick={onWireClick}
            shadowColor={glow}
            shadowBlur={wire.energized ? 3 : 0}
          />
          <Line
            points={wire.points}
            stroke={vis.stroke2}
            strokeWidth={Math.max(0.75, vis.strokeWidth * 0.55)}
            opacity={opacity}
            dash={vis.dash}
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        </>
      ) : vis.kind === 'neutral' ? (
        <>
          <Line
            points={wire.points}
            stroke={vis.main}
            strokeWidth={vis.strokeWidth}
            opacity={opacity}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={8}
            onClick={onWireClick}
            shadowColor={glow}
            shadowBlur={wire.energized ? 3 : 0}
          />
          <Line
            points={wire.points}
            stroke={vis.accent}
            strokeWidth={Math.max(0.5, vis.strokeWidth * 0.45)}
            opacity={Math.min(1, opacity + 0.04)}
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        </>
      ) : vis.kind === 'comm' ? (
        <>
          <Line
            points={wire.points}
            stroke={vis.stroke}
            strokeWidth={vis.strokeWidth}
            opacity={opacity}
            dash={vis.dash}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={8}
            onClick={onWireClick}
            shadowColor={glow}
            shadowBlur={wire.energized ? 3 : 0}
          />
          {vis.mid && (
            <Text
              x={vis.mid.x - 12}
              y={vis.mid.y - 8}
              width={24}
              text={vis.mark}
              align="center"
              fontSize={7}
              fill="#67E8F9"
              fontStyle="bold"
              listening={false}
            />
          )}
        </>
      ) : (
        <Line
          points={wire.points}
          stroke={vis.stroke}
          strokeWidth={vis.strokeWidth}
          opacity={opacity}
          dash={vis.dash}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={8}
          onClick={onWireClick}
          shadowColor={glow}
          shadowBlur={wire.energized ? 3 : 0}
        />
      )}
      {showWireLabel && labelLayout != null && (
        <Group
          x={labelLayout.midX}
          y={labelLayout.midY}
          rotation={labelLayout.angleDeg}
          listening={false}
        >
          <Rect
            x={-Math.min(52, 6 + labelText.length * 5.5) / 2}
            y={-8}
            width={Math.min(52, 6 + labelText.length * 5.5)}
            height={16}
            cornerRadius={3}
            fill="rgba(15,23,42,0.78)"
            stroke="rgba(148,163,184,0.5)"
            strokeWidth={0.35}
          />
          <Text
            x={-Math.min(48, 4 + labelText.length * 5.5) / 2}
            y={-6}
            width={Math.min(48, 4 + labelText.length * 5.5)}
            text={labelText}
            fontSize={8}
            fontStyle="bold"
            fill="#F8FAFC"
            align="center"
            listening={false}
          />
        </Group>
      )}
    </>
  );
};

export default WireSegment;
