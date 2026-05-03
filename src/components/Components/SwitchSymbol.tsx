import React, { useEffect } from 'react';
import { Group, Circle, Line, Text } from 'react-konva';
import type { CircuitComponent, NodeResult, ToolMode } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import {
  ConnectionPointDots,
  DeviceBody,
  SelectionFrame,
  TerminalPocket,
} from './SymbolPrimitives';
import { SymbolColors } from './SymbolTokens';

const STROKE = 2;

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onToggle?: () => void;
  onPushChange?: (pressed: boolean) => void;
  variant?: 'switch' | 'push_button';
  tool?: ToolMode;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

/**
 * SPST / push-button: terminals **1** (top) / **2** (bottom) match `createConnectionPoints`.
 * Blade vertical when closed, angled when open.
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
  const color = energized ? SymbolColors.live : SymbolColors.bodyStroke;
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
          <SelectionFrame x={-20} y={-26} width={40} height={52} />
        )}

        <DeviceBody
          x={-16}
          y={-22}
          width={32}
          height={44}
          energized={energized}
        />

        <TerminalPocket
          x={0}
          y={-17}
          leadToY={-20}
          label="1"
          labelY={-30}
        />
        <TerminalPocket
          x={0}
          y={17}
          leadToY={20}
          label="2"
          labelY={24}
        />

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

        <Circle x={0} y={0} radius={2} fill={color} listening={false} />

        {energized && (
          <Circle
            x={0}
            y={-16}
            radius={7}
            fill={SymbolColors.live}
            opacity={0.2}
            listening={false}
          />
        )}

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={16}
          y={-8}
          width={112}
          fontSize={component.properties.labelFontSize ?? 9}
          fill={SymbolColors.labelMuted}
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
          fill={contactsClosed ? SymbolColors.on : SymbolColors.off}
          listening={false}
        />

        {switchType && (
          <Text
            text={switchType}
            x={16}
            y={14}
            fontSize={7}
            fill={SymbolColors.labelMuted}
            listening={false}
          />
        )}

        {isPush && (
          <Text
            text={isNc ? 'NC' : 'NO'}
            x={16}
            y={switchType ? 22 : 14}
            fontSize={7}
            fill={SymbolColors.labelMuted}
            listening={false}
          />
        )}

        {showConnectionPoints && (
          <ConnectionPointDots connectionPoints={component.connectionPoints} />
        )}
      </ScaledSymbolInner>
    </Group>
  );
};

export default SwitchSymbol;
