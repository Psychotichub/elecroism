import React from 'react';
import { Group, Rect, Text, Circle, Line } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import { useCircuitStore } from '../../store/circuitStore';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onCycleMode: () => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const minX = -36;
const maxX = 36;
const minY = -34;
const maxY = 34;
const bodyW = maxX - minX;
const bodyH = maxY - minY;

const MultimeterSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  onCycleMode,
  showConnectionPoints,
  selected,
}) => {
  const continuityThreshold =
    useCircuitStore((s) => s.circuit.continuityPowerThresholdW) ?? 0.5;
  const mode = component.properties.multimeterMode ?? 'voltage';
  const selectedSignal = component.properties.multimeterSignal ?? 'auto';
  const detectedSignal =
    (nodeResult as NodeResult & { meterSignal?: 'ac' | 'dc' } | undefined)
      ?.meterSignal ?? 'ac';
  const signal =
    selectedSignal === 'auto'
      ? detectedSignal
      : selectedSignal;
  const v = Math.abs(nodeResult?.voltageV ?? 0);
  const i = Math.abs(nodeResult?.currentA ?? 0);
  const continuity = (nodeResult?.powerW ?? 0) > continuityThreshold;
  const hvEnabled = component.properties.multimeterHighVoltage !== false;
  const hvLimit = Math.max(100, component.properties.multimeterMaxVoltage ?? 1000);
  const hvDetected = hvEnabled && v >= 600;
  const overLimit = hvEnabled && v > hvLimit;
  const sigMark =
    selectedSignal === 'auto'
      ? `${signal.toUpperCase()}*`
      : signal === 'dc'
        ? 'DC'
        : 'AC';
  const display = mode === 'continuity'
    ? continuity
      ? 'BEEP'
      : 'OPEN'
    : mode === 'current'
      ? `${i.toFixed(i >= 10 ? 1 : 2)} A`
      : `${v.toFixed(v >= 100 ? 0 : 1)} V`;

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
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
    >
      <ScaledSymbolInner component={component}>
        {selected && (
          <Rect
            x={minX - 4}
            y={minY - 4}
            width={bodyW + 8}
            height={bodyH + 8}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={6}
          />
        )}
        <Rect
          x={minX}
          y={minY}
          width={bodyW}
          height={bodyH}
          fill="#111827"
          stroke="#030712"
          strokeWidth={1.6}
          cornerRadius={5}
        />
        <Rect
          x={minX + 6}
          y={minY + 6}
          width={bodyW - 12}
          height={18}
          fill={mode === 'continuity' ? '#052E16' : '#082F49'}
          stroke={mode === 'continuity' ? '#166534' : '#0E7490'}
          strokeWidth={1}
          cornerRadius={2}
        />
        <Text
          text={display}
          x={minX + 8}
          y={minY + 10}
          width={bodyW - 16}
          align="center"
          fontSize={10}
          fontStyle="bold"
          fill={mode === 'continuity' ? '#86EFAC' : '#BAE6FD'}
          listening={false}
        />
        <Text
          text={
            mode === 'continuity'
              ? 'CONT'
              : mode === 'current'
                ? signal === 'dc'
                  ? 'A='
                  : 'A~'
                : signal === 'dc'
                  ? 'V='
                  : 'V~'
          }
          x={minX + 8}
          y={minY + 28}
          width={26}
          align="left"
          fontSize={8}
          fontStyle="bold"
          fill="#D1D5DB"
          listening={false}
        />
        <Text
          text={hvEnabled ? `HV ${hvLimit}V` : 'HV OFF'}
          x={maxX - 36}
          y={minY + 28}
          width={30}
          align="right"
          fontSize={7}
          fontStyle="bold"
          fill={hvEnabled ? '#FCA5A5' : '#9CA3AF'}
          listening={false}
        />
        <Text
          text={sigMark}
          x={-10}
          y={minY + 28}
          width={20}
          align="center"
          fontSize={7}
          fontStyle="bold"
          fill="#D1D5DB"
          listening={false}
        />
        <Rect
          x={maxX - 20}
          y={minY + 26}
          width={14}
          height={10}
          cornerRadius={2}
          fill="#0F172A"
          stroke="#64748B"
          strokeWidth={1}
          onClick={(e) => {
            e.cancelBubble = true;
            onCycleMode();
          }}
        />
        <Text
          text="MODE"
          x={maxX - 48}
          y={minY + 28}
          width={26}
          align="right"
          fontSize={6}
          fill="#9CA3AF"
          listening={false}
        />

        {continuity && mode === 'continuity' && (
          <Circle
            x={0}
            y={2}
            radius={3}
            fill="#FBBF24"
            shadowColor="#F59E0B"
            shadowBlur={8}
          />
        )}
        {(hvDetected || overLimit) && (
          <Text
            text={overLimit ? 'OVER' : 'HV'}
            x={-10}
            y={6}
            width={20}
            align="center"
            fontSize={8}
            fontStyle="bold"
            fill="#FCA5A5"
            listening={false}
          />
        )}

        {component.connectionPoints.map((cp) => {
          const isCom = cp.label.toUpperCase() === 'COM';
          return (
            <React.Fragment key={cp.id}>
              <Line
                points={[cp.x, cp.y - 8, cp.x, cp.y]}
                stroke={isCom ? '#2563EB' : '#DC2626'}
                strokeWidth={2}
                lineCap="round"
              />
              <Text
                text={cp.label}
                x={cp.x - 14}
                y={cp.y - 18}
                width={28}
                align="center"
                fontSize={7}
                fontStyle="bold"
                fill={isCom ? '#93C5FD' : '#FCA5A5'}
                listening={false}
              />
            </React.Fragment>
          );
        })}

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={minX - 2}
          y={maxY + 8}
          width={bodyW + 4}
          fontSize={component.properties.labelFontSize ?? 8}
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

export default MultimeterSymbol;
