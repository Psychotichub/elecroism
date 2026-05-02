import React, { useEffect, useRef } from 'react';
import { Group, Circle, Line, Text } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import Konva from 'konva';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const LoadSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const isLamp = component.type === 'lamp';
  const isMotor = component.type === 'motor';
  const isPanelHeater = component.type === 'panel_heater';
  const isCoolingFan = component.type === 'cooling_fan';
  const motorRef = useRef<Konva.Group>(null);
  const fanRef = useRef<Konva.Group>(null);
  const glowRef = useRef<Konva.Circle>(null);

  useEffect(() => {
    if (isMotor && energized && motorRef.current) {
      const anim = new Konva.Animation((frame) => {
        if (frame && motorRef.current) {
          motorRef.current.rotation(frame.time * 0.1);
        }
      }, motorRef.current.getLayer());
      anim.start();
      return () => { anim.stop(); };
    }
  }, [isMotor, energized]);

  useEffect(() => {
    if (component.type !== 'cooling_fan' || !energized || !fanRef.current) return;
    const anim = new Konva.Animation((frame) => {
      if (frame && fanRef.current) {
        fanRef.current.rotation(frame.time * 0.35);
      }
    }, fanRef.current.getLayer());
    anim.start();
    return () => {
      anim.stop();
    };
  }, [component.type, energized]);

  useEffect(() => {
    if (isLamp && energized && glowRef.current) {
      const anim = new Konva.Animation((frame) => {
        if (frame && glowRef.current) {
          const opacity = 0.25 + 0.1 * Math.sin(frame.time * 0.003);
          glowRef.current.opacity(opacity);
        }
      }, glowRef.current.getLayer());
      anim.start();
      return () => { anim.stop(); };
    }
  }, [isLamp, energized]);

  const getFill = () => {
    if (!energized) return '#E5E7EB';
    if (isLamp) return '#FCD34D';
    if (isMotor) return '#4ADE80';
    if (isCoolingFan) return '#7DD3FC';
    if (isPanelHeater || component.type === 'heater') return '#FB923C';
    return '#FB923C';
  };

  const getSymbolContent = () => {
    if (isLamp) {
      return (
        <>
          <Line points={[-10, -10, 10, 10]} stroke="#374151" strokeWidth={1.5} />
          <Line points={[10, -10, -10, 10]} stroke="#374151" strokeWidth={1.5} />
        </>
      );
    }
    if (isMotor) {
      return (
        <Group ref={motorRef}>
          <Text
            text="M"
            x={-5}
            y={-6}
            fontSize={12}
            fill="#374151"
            fontStyle="bold"
            listening={false}
          />
        </Group>
      );
    }
    return (
      <Text
        text={component.type === 'heater' ? 'H' : 'L'}
        x={-4}
        y={-6}
        fontSize={12}
        fill="#374151"
        fontStyle="bold"
        listening={false}
      />
    );
  };

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
        <Circle
          x={0}
          y={0}
          radius={20}
          stroke="#3B82F6"
          strokeWidth={2}
          dash={[4, 4]}
        />
      )}

      {isLamp && energized && (
        <Circle
          ref={glowRef}
          x={0}
          y={0}
          radius={22}
          fill="#FCD34D"
          opacity={0.3}
          listening={false}
        />
      )}

      <Circle
        x={0}
        y={0}
        radius={16}
        fill={getFill()}
        stroke="#374151"
        strokeWidth={1.5}
        shadowColor={energized && isLamp ? '#FCD34D' : undefined}
        shadowBlur={energized && isLamp ? 12 : 0}
      />

      {getSymbolContent()}

      <Line points={[0, -16, 0, -20]} stroke="#374151" strokeWidth={2} />
      <Line points={[0, 16, 0, 20]} stroke="#374151" strokeWidth={2} />

      <ComponentCanvasLabel
        componentId={component.id}
        label={component.label}
        x={14}
        y={-8}
        width={72}
        fontSize={component.properties.labelFontSize ?? 8}
        offsetX={component.properties.labelOffsetX ?? 0}
        offsetY={component.properties.labelOffsetY ?? 0}
      />
      <Text
        text={`${component.properties.powerWatts || 0}W`}
        x={18}
        y={5}
        fontSize={7}
        fill="#9CA3AF"
        listening={false}
      />

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

export default LoadSymbol;
