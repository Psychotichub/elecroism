import React, { useEffect } from 'react';
import { Group, Circle, Line, Text } from 'react-konva';
import type { CircuitComponent, NodeResult, ToolMode } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  /** Latching switch: double-click toggles */
  onToggle?: () => void;
  /** Select tool only: pointer down/up momentary */
  onPushChange?: (pressed: boolean) => void;
  variant?: 'switch' | 'push_button';
  tool?: ToolMode;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const SwitchSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onToggle,
  onPushChange,
  variant = 'switch',
  tool = 'select',
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const isPush = variant === 'push_button';
  const isNc = component.properties.buttonType === 'NC';
  const contactsClosed = !isPush
    ? component.state === 'on'
    : component.pressed !== undefined
      ? isNc
        ? !component.pressed
        : !!component.pressed
      : isNc
        ? true
        : component.state === 'on';

  const energized = nodeResult?.energized || false;
  const color = energized ? '#F59E0B' : '#374151';

  useEffect(() => {
    if (!isPush || !component.pressed) return;
    const release = () => onPushChange?.(false);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
  }, [isPush, component.pressed, onPushChange]);

  return (
    <Group
      x={component.x}
      y={component.y}
      rotation={component.rotation}
      draggable
      dragDistance={isPush ? 10 : undefined}
      onPointerDown={(e) => {
        if (!isPush || tool !== 'select') return;
        e.cancelBubble = true;
        onPushChange?.(true);
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        if (!isPush) onToggle?.();
      }}
      onDragEnd={(e) => {
        onDragEnd(e.target.x(), e.target.y());
      }}
    >
      <ScaledSymbolInner component={component}>
      {selected && (
        <Line
          points={[-18, -24, 18, -24, 18, 24, -18, 24]}
          closed
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
        />
      )}

      <Circle x={0} y={-16} radius={4} fill={color} stroke={color} strokeWidth={1.5} />
      <Circle x={0} y={16} radius={4} fill={color} stroke={color} strokeWidth={1.5} />

      {contactsClosed ? (
        <Line points={[0, -12, 0, 12]} stroke={color} strokeWidth={2.5} />
      ) : (
        <Line points={[0, -12, 12, 8]} stroke={color} strokeWidth={2.5} />
      )}

      <Line points={[0, -16, 0, -20]} stroke={color} strokeWidth={2} />
      <Line points={[0, 16, 0, 20]} stroke={color} strokeWidth={2} />

      {energized && (
        <Circle
          x={0}
          y={-16}
          radius={6}
          fill="#F59E0B"
          opacity={0.3}
          listening={false}
        />
      )}

      <Text
        text={component.label}
        x={14}
        y={-6}
        fontSize={10}
        fill="#6B7280"
        listening={false}
      />

      <Text
        text={
          isPush
            ? contactsClosed
              ? 'Closed'
              : 'Open'
            : contactsClosed
              ? 'ON'
              : 'OFF'
        }
        x={14}
        y={6}
        fontSize={8}
        fill={contactsClosed ? '#22C55E' : '#9CA3AF'}
        listening={false}
      />

      {isPush && (
        <Text
          text={isNc ? 'NC' : 'NO'}
          x={14}
          y={16}
          fontSize={7}
          fill="#9CA3AF"
          listening={false}
        />
      )}

      {showConnectionPoints &&
        component.connectionPoints.map((cp) => (
          <Circle
            key={cp.id}
            x={cp.x}
            y={cp.y}
            radius={5}
            fill="#3B82F6"
            opacity={0.6}
            stroke="#2563EB"
            strokeWidth={1}
          />
        ))}
      </ScaledSymbolInner>
    </Group>
  );
};

export default SwitchSymbol;
