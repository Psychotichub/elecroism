import React, { useMemo } from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import { getCanvasInteractionColors } from '../../design/canvasInteractionColors';
import type {
  CircuitComponent,
  ComponentProperties,
  NodeResult,
} from '../../types';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';
import ScaledSymbolInner from './ScaledSymbolInner';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const minX = -44;
const maxX = 44;
const minY = -28;
const maxY = 28;
const bodyW = maxX - minX;
const bodyH = maxY - minY;

function rectifierGlyph(
  cx: number,
  cy: number,
  rectifier: NonNullable<ComponentProperties['acDcRectifierType']>
): React.ReactNode {
  const stroke = '#1E40AF';
  const sw = 1.2;
  if (rectifier === 'half_wave') {
    return (
      <Group>
        <Line
          points={[cx - 5, cy, cx + 2, cy - 4, cx + 2, cy + 4]}
          closed
          stroke={stroke}
          strokeWidth={sw}
          fill="#EFF6FF"
        />
        <Line points={[cx + 2, cy, cx + 6, cy]} stroke={stroke} strokeWidth={sw} />
      </Group>
    );
  }
  if (rectifier === 'full_wave') {
    return (
      <Group>
        <Line
          points={[cx - 5, cy - 2, cx, cy + 3]}
          stroke={stroke}
          strokeWidth={sw}
        />
        <Line points={[cx, cy - 2, cx, cy + 3]} stroke={stroke} strokeWidth={sw} />
        <Line points={[cx, cy - 2, cx + 5, cy + 3]} stroke={stroke} strokeWidth={sw} />
        <Line points={[cx - 5, cy + 4, cx + 5, cy + 4]} stroke={stroke} strokeWidth={sw} />
      </Group>
    );
  }
  // bridge
  return (
    <Group>
      <Line
        points={[cx, cy - 5, cx + 5, cy, cx, cy + 5, cx - 5, cy]}
        stroke={stroke}
        strokeWidth={sw}
        closed
        fill="#DBEAFE"
      />
      <Line points={[cx - 5, cy, cx + 5, cy]} stroke={stroke} strokeWidth={sw} />
    </Group>
  );
}

const ACDCConverterSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const energized = nodeResult?.energized || false;
  const p = component.properties;
  const vOut = p.voltage ?? 24;
  const vin = p.acDcInputVoltageV ?? 230;
  const fhz = p.acDcMainsFrequencyHz ?? 50;
  const hasXf = p.acDcHasTransformer ?? true;
  const hasReg = p.acDcHasRegulator ?? true;
  const rectifier = p.acDcRectifierType ?? 'bridge';

  const wavePoints = useMemo(() => {
    const pts: number[] = [];
    const wx0 = minX + 10;
    const wx1 = maxX - 10;
    const amp = 4;
    const mid = -1;
    const steps = 36;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = wx0 + t * (wx1 - wx0);
      const ang = t * Math.PI * 2;
      const s = Math.sin(ang);
      const y =
        mid -
        (rectifier === 'half_wave' ? Math.max(0, s) * amp : Math.abs(s) * amp);
      pts.push(x, y);
    }
    return pts;
  }, [rectifier]);

  const stageStroke = energized ? '#1D4ED8' : '#64748B';
  const stageFill = energized ? '#EFF6FF' : '#F8FAFC';
  const cellW = (bodyW - 12) / 4;
  const rowY = -20;
  const cellH = 14;

  const stageBox = (i: number, label: string, children: React.ReactNode) => {
    const x0 = minX + 6 + i * cellW;
    return (
      <Group key={label}>
        <Rect
          x={x0}
          y={rowY}
          width={cellW - 2}
          height={cellH}
          fill={stageFill}
          stroke={stageStroke}
          strokeWidth={1}
          cornerRadius={2}
        />
        <Text
          text={label}
          x={x0}
          y={rowY + 1}
          width={cellW - 2}
          align="center"
          fontSize={4.5}
          fill="#475569"
          listening={false}
        />
        <Group x={x0 + (cellW - 2) / 2} y={rowY + cellH / 2 + 2}>
          {children}
        </Group>
      </Group>
    );
  };

  return (
    <Group
      x={component.x}
      y={component.y}
      rotation={component.rotation}
      data-component-id={component.id}
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
            stroke={getCanvasInteractionColors().selection}
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}

        <Rect
          x={minX}
          y={minY}
          width={bodyW}
          height={bodyH}
          fill={energized ? '#DBEAFE' : '#F1F5F9'}
          stroke={energized ? '#1D4ED8' : '#475569'}
          strokeWidth={2}
          cornerRadius={4}
        />

        <Text
          text="LINEAR AC→DC"
          x={minX}
          y={minY + 2}
          width={bodyW}
          align="center"
          fontSize={6}
          fill="#0F172A"
          fontStyle="bold"
          listening={false}
        />
        <Text
          text={`${vin} V ~  ${fhz} Hz  →  ${vOut} V =`}
          x={minX}
          y={minY + 9}
          width={bodyW}
          align="center"
          fontSize={5.5}
          fill="#334155"
          listening={false}
        />

        {/* Optional transformer: two facing coil arcs */}
        {stageBox(
          0,
          hasXf ? '1 XFMR' : '1 (—)',
          hasXf ? (
            <Group>
              <Circle x={-3} y={0} radius={3.5} stroke="#64748B" strokeWidth={1} />
              <Circle x={3} y={0} radius={3.5} stroke="#64748B" strokeWidth={1} />
            </Group>
          ) : (
            <Text
              text="bypass"
              x={-12}
              y={-4}
              width={24}
              fontSize={4}
              fill="#94A3B8"
              listening={false}
            />
          )
        )}

        {stageBox(
          1,
          '2 RECT',
          <Group>{rectifierGlyph(0, 0, rectifier)}</Group>
        )}

        {stageBox(2, '3 FILTER', (
          <Group>
            <Line points={[-4, -4, -4, 4]} stroke="#64748B" strokeWidth={1.2} />
            <Line points={[4, -4, 4, 4]} stroke="#64748B" strokeWidth={1.2} />
          </Group>
        ))}

        {stageBox(
          3,
          hasReg ? '4 REG' : '4 (—)',
          hasReg ? (
            <Rect
              x={-6}
              y={-4}
              width={12}
              height={8}
              stroke="#059669"
              strokeWidth={1}
              fill="#ECFDF5"
              cornerRadius={1}
            />
          ) : (
            <Text
              text="open"
              x={-10}
              y={-3}
              width={20}
              fontSize={4}
              fill="#94A3B8"
              listening={false}
            />
          )
        )}

        <Text
          text={
            rectifier === 'half_wave'
              ? 'Pulsating DC (half-wave — one polarity only)'
              : rectifier === 'full_wave'
                ? 'Pulsating DC (full-wave — |sin| envelope idealised)'
                : 'Pulsating DC (bridge — |sin| envelope idealised)'
          }
          x={minX}
          y={-3}
          width={bodyW}
          align="center"
          fontSize={4}
          fill="#64748B"
          listening={false}
        />
        <Line
          points={wavePoints}
          stroke={energized ? '#2563EB' : '#94A3B8'}
          strokeWidth={1.2}
          lineCap="round"
          listening={false}
        />

        <Text
          text="Not SMPS — classical rectify + filter + regulate"
          x={minX}
          y={8}
          width={bodyW}
          align="center"
          fontSize={4.5}
          fill="#475569"
          listening={false}
        />

        <Line
          points={[minX + 8, 16, maxX - 8, 16]}
          stroke="#94A3B8"
          strokeWidth={1}
          dash={[2, 2]}
          listening={false}
        />

        {component.connectionPoints.map((cp) => {
          const u = cp.label.toUpperCase();
          const isAc = u.startsWith('AC');
          const stroke = u.includes('PLUS')
            ? '#DC2626'
            : u.includes('MINUS')
              ? '#1F2937'
              : u === 'AC_L'
                ? '#7C3F19'
                : '#2563EB';
          const stubY = isAc ? cp.y + 3 : cp.y - 3;
          const sign = u.includes('PLUS')
            ? '+'
            : u.includes('MINUS')
              ? '−'
              : u === 'AC_L'
                ? 'L'
                : 'N';
          const tagX = cp.x - 6;
          const tagY = isAc ? cp.y - 12 : cp.y + 4;
          return (
            <React.Fragment key={cp.id}>
              <Line
                points={[cp.x, stubY, cp.x, cp.y]}
                stroke={stroke}
                strokeWidth={2.5}
                lineCap="round"
              />
              <Text
                text={sign}
                x={tagX}
                y={tagY}
                width={12}
                align="center"
                fontSize={9}
                fill={stroke}
                fontStyle="bold"
                listening={false}
              />
            </React.Fragment>
          );
        })}

        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={minX - 4}
          y={maxY + 8}
          width={bodyW + 8}
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

export default ACDCConverterSymbol;
