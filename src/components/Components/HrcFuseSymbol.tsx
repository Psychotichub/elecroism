import React from 'react';
import { useTripFlash } from '../../hooks/useTripFlash';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import ScaledSymbolInner from './ScaledSymbolInner';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onToggle: () => void;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const HrcFuseSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const OUTLINE = 1.6;
  const isTripped = component.state === 'tripped';
  const flashVisible = useTripFlash(isTripped, 450);
  const isClosed = component.state === 'on';
  const energized = nodeResult?.energized || false;
  const rating = component.properties.ratingAmps ?? 32;
  const poles = component.type === 'hrc_fuse' ? component.properties.poles ?? 1 : 1;
  const poleXs = poles >= 3 ? [-24, 0, 24] : [0];
  const frameWidth = poles >= 3 ? 92 : 48;
  const frameX = -frameWidth / 2;
  const ctrlMode = component.properties.controlCircuitSupplyMode ?? 'single_phase_ln';
  const ctrlV = component.properties.controlCircuitVoltage ?? 230;
  const ctrlTag =
    ctrlMode === 'derived_from_3ph_ll'
      ? '3PH->1PH'
      : ctrlMode === 'monitoring_3ph'
        ? '3PH MON'
        : 'L-N';
  const hrcClass = component.properties.hrcType ?? 'gG';
  const hrcKa = component.properties.hrcBreakingCapacityKa ?? 80;
  const title = component.type === 'control_circuit_fuse' ? 'CTRL' : 'HRC';

  return (
    <Group
      x={component.x}
      y={component.y}
      rotation={component.rotation}
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        onToggle();
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected && (
          <Rect
            x={frameX}
            y={-34}
            width={frameWidth}
            height={68}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}

        {poleXs.map((x) => (
          <React.Fragment key={`pole-${x}`}>
            <Line points={[x, -30, x, -18]} stroke="#374151" strokeWidth={2} />
            <Line points={[x, 18, x, 30]} stroke="#374151" strokeWidth={2} />
            <Rect
              x={x - 6}
              y={-18}
              width={12}
              height={36}
              fill={energized ? '#FFF7ED' : '#F3F4F6'}
              stroke="#374151"
              strokeWidth={OUTLINE}
              cornerRadius={2}
              shadowColor="#111827"
              shadowBlur={3}
              shadowOpacity={0.2}
              shadowOffsetY={1}
            />
            <Rect
              x={x - 5}
              y={-16}
              width={10}
              height={32}
              fill="#FFFFFF"
              opacity={0.14}
              cornerRadius={2}
              listening={false}
            />
            <Rect
              x={x - 4}
              y={-12}
              width={8}
              height={24}
              fill={isTripped ? '#FCA5A5' : '#FFFFFF'}
              stroke="#6B7280"
              strokeWidth={0.9}
              cornerRadius={2}
            />
            <Circle x={x} y={-9} radius={1.2} fill="#6B7280" listening={false} />
            <Circle x={x} y={9} radius={1.2} fill="#6B7280" listening={false} />
            {isClosed ? (
              <Line
                points={[x - 2.5, 10, x, 4, x + 2.5, -2]}
                stroke="#16A34A"
                strokeWidth={2}
                lineCap="round"
                lineJoin="round"
              />
            ) : (
              <Line
                points={[x - 2.5, 10, x, 2, x + 2.5, -10]}
                stroke="#EF4444"
                strokeWidth={2}
                lineCap="round"
                lineJoin="round"
              />
            )}
          </React.Fragment>
        ))}

        <Text
          text={title}
          x={frameX}
          y={-28}
          width={frameWidth}
          align="center"
          fontSize={7}
          fill="#374151"
          fontStyle="bold"
          listening={false}
        />
        <Text
          text={`${rating}A`}
          x={frameX}
          y={20}
          width={frameWidth}
          align="center"
          fontSize={7}
          fill="#6B7280"
          listening={false}
        />
        {component.type === 'control_circuit_fuse' && (
          <>
            <Text
              text={`${ctrlV}V`}
              x={frameX}
              y={-36}
              width={frameWidth}
              align="center"
              fontSize={6}
              fill="#374151"
              listening={false}
            />
            <Text
              text={ctrlTag}
              x={frameX}
              y={-3}
              width={frameWidth}
              align="center"
              fontSize={6}
              fill="#1D4ED8"
              fontStyle="bold"
              listening={false}
            />
          </>
        )}
        {component.type === 'hrc_fuse' && (
          <>
            <Text
              text={`${hrcClass}`}
              x={-10}
              y={-3}
              width={20}
              align="center"
              fontSize={6}
              fill="#7C2D12"
              fontStyle="bold"
              listening={false}
            />
            <Text
              text={`${hrcKa}kA`}
              x={frameX}
              y={-36}
              width={frameWidth}
              align="center"
              fontSize={6}
              fill="#374151"
              listening={false}
            />
          </>
        )}

        {isTripped && (
          <Circle
            x={8}
            y={-12}
            radius={3}
            fill="#EF4444"
            opacity={flashVisible ? 1 : 0.35}
          />
        )}

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={-32}
          y={34}
          width={64}
          fontSize={component.properties.labelFontSize ?? 7}
                  offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
        />

        {showConnectionPoints &&
          component.connectionPoints.map((cp) => (
            <Circle
              key={cp.id}
              x={cp.x}
              y={cp.y}
            radius={4.5}
              fill="#3B82F6"
            opacity={0.7}
              stroke="#2563EB"
            strokeWidth={1.2}
            />
          ))}
      </ScaledSymbolInner>
    </Group>
  );
};

export default HrcFuseSymbol;
