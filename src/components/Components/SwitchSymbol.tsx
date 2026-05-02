import React, { useEffect } from 'react';
import { Group, Circle, Line, Text, Rect } from 'react-konva';
import type { CircuitComponent, NodeResult, ToolMode } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';

/** Aligned with {@link TwoWaySwitchSymbol} / `component_symbol.md` (stroke, terminals, labels). */
const STROKE = 2;
const OUTLINE = 1.5;
const R_TERM = 4;

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

/**
 * SPST-style single-break symbol: terminals **IN** (top) / **OUT** (bottom) match
 * `createConnectionPoints`. Blade vertical when closed, angled when open (contact gap).
 */
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
  const bodyStroke = energized ? '#D97706' : '#D1D5DB';
  const termFillTop = contactsClosed ? '#FEF3C7' : '#F3F4F6';
  const termFillBot = contactsClosed ? '#FEF3C7' : '#F3F4F6';

  const switchType = !isPush
    ? component.properties.switchType || 'SPST'
    : null;

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
            points={[-22, -28, 22, -28, 22, 30, -22, 30]}
            closed
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
          />
        )}

        {/* Body outline — schematic frame (clarity over photorealism). */}
        <Rect
          x={-16}
          y={-22}
          width={32}
          height={44}
          cornerRadius={4}
          stroke={bodyStroke}
          strokeWidth={1}
          fill={energized ? 'rgba(254,243,199,0.35)' : 'rgba(249,250,251,0.9)'}
          listening={false}
        />

        {/* Fixed terminals (wire attach y = ±20). */}
        <Circle
          x={0}
          y={-16}
          radius={R_TERM}
          fill={termFillTop}
          stroke={color}
          strokeWidth={OUTLINE}
        />
        <Circle
          x={0}
          y={16}
          radius={R_TERM}
          fill={termFillBot}
          stroke={color}
          strokeWidth={OUTLINE}
        />

        {/* Moving blade: closed = bridge; open = break with visible gap. */}
        {contactsClosed ? (
          <Line
            points={[0, -12, 0, 12]}
            stroke={color}
            strokeWidth={STROKE + 0.25}
            lineCap="round"
          />
        ) : (
          <Line
            points={[0, -12, 11, 7]}
            stroke={color}
            strokeWidth={STROKE + 0.25}
            lineCap="round"
          />
        )}

        <Line
          points={[0, -16, 0, -20]}
          stroke={color}
          strokeWidth={STROKE}
          lineCap="round"
        />
        <Line
          points={[0, 16, 0, 20]}
          stroke={color}
          strokeWidth={STROKE}
          lineCap="round"
        />

        <Circle x={0} y={0} radius={2} fill={color} listening={false} />

        {energized && (
          <Circle
            x={0}
            y={-16}
            radius={7}
            fill="#F59E0B"
            opacity={0.22}
            listening={false}
          />
        )}

        <Text
          text="IN"
          x={-12}
          y={-30}
          width={24}
          align="center"
          fontSize={6}
          fontStyle="bold"
          fill="#6B7280"
          listening={false}
        />
        <Text
          text="OUT"
          x={-12}
          y={22}
          width={24}
          align="center"
          fontSize={6}
          fontStyle="bold"
          fill="#6B7280"
          listening={false}
        />

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={16}
          y={-8}
          width={112}
          fontSize={component.properties.labelFontSize ?? 10}
          fill="#6B7280"
          offsetX={component.properties.labelOffsetX ?? 0}
          offsetY={component.properties.labelOffsetY ?? 0}
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
          x={16}
          y={4}
          fontSize={8}
          fill={contactsClosed ? '#22C55E' : '#9CA3AF'}
          listening={false}
        />

        {switchType && (
          <Text
            text={switchType}
            x={16}
            y={14}
            fontSize={7}
            fill="#9CA3AF"
            listening={false}
          />
        )}

        {isPush && (
          <Text
            text={isNc ? 'NC' : 'NO'}
            x={16}
            y={switchType ? 22 : 14}
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
