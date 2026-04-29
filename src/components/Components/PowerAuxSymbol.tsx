import React from 'react';
import { Group, Rect, Text, Circle, Line } from 'react-konva';
import type { CircuitComponent, NodeResult } from '../../types';
import ScaledSymbolInner from './ScaledSymbolInner';
import { ComponentCanvasLabel } from './ComponentCanvasLabel';

interface Props {
  component: CircuitComponent;
  nodeResult?: NodeResult;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  showConnectionPoints: boolean;
  selected: boolean;
}

const PowerAuxSymbol: React.FC<Props> = ({
  component,
  nodeResult,
  onSelect,
  onDragEnd,
  showConnectionPoints,
  selected,
}) => {
  const OUTLINE = 1.6;
  const energized = nodeResult?.energized || false;
  const isPriorityDevice =
    component.type === 'uvr_release' ||
    component.type === 'shunt_trip_coil' ||
    component.type === 'closing_coil' ||
    component.type === 'current_transformer' ||
    component.type === 'voltage_transformer' ||
    component.type === 'power_quality_analyzer';
  const accentColor =
    component.type === 'power_quality_analyzer'
      ? '#0EA5E9'
      : component.type === 'current_transformer' || component.type === 'voltage_transformer'
        ? '#7C3AED'
        : component.type === 'shunt_trip_coil' || component.type === 'closing_coil' || component.type === 'uvr_release'
          ? '#DC2626'
          : '#16A34A';
  const title =
    component.type === 'ups_module'
      ? 'UPS'
      : component.type === 'dc_battery_backup'
        ? 'DC BAT'
        : component.type === 'motor_operator_kit'
          ? 'MOTOR OP'
          : component.type === 'shunt_trip_coil'
            ? 'SHUNT TRIP'
            : component.type === 'closing_coil'
              ? 'CLOSING COIL'
              : component.type === 'uvr_release'
                ? 'UVR'
        : component.type === 'key_interlock'
          ? 'KEY'
          : component.type === 'neutral_link'
            ? 'N LINK'
            : component.type === 'earth_link'
              ? 'PE LINK'
              : component.type === 'current_transformer'
                ? 'CT'
                : component.type === 'voltage_transformer'
                  ? 'VT'
                  : component.type === 'din_rail'
                    ? 'DIN'
                    : component.type === 'mounting_plate'
                      ? 'PLATE'
                      : component.type === 'cable_duct'
                        ? 'DUCT'
                        : component.type === 'busbar_support_insulator'
                          ? 'BUSBAR SUP'
                        : component.type === 'ferrule_cable_markers'
                          ? 'FERRULE'
                        : component.type === 'control_wiring'
                          ? 'CTRL WIRE'
                        : component.type === 'power_cables'
                          ? 'PWR CABLE'
                        : component.type === 'ms_gi_sheet_enclosure'
                          ? 'MS/GI ENC'
                        : component.type === 'ip_rated_enclosure'
                          ? 'ENCLOSURE'
                  : component.type === 'power_quality_analyzer'
                    ? 'PQA'
        : 'TB';
  const subtitle =
    component.type === 'ups_module'
      ? `${component.properties.ratingAmps ?? 10}A`
      : component.type === 'dc_battery_backup'
        ? `${component.properties.voltage ?? 24}V`
        : component.type === 'motor_operator_kit'
          ? `${component.properties.voltage ?? 230}V act`
          : component.type === 'shunt_trip_coil'
            ? `${component.properties.voltage ?? 24}V coil`
            : component.type === 'closing_coil'
              ? `${component.properties.voltage ?? 24}V close`
              : component.type === 'uvr_release'
                ? `${component.properties.voltage ?? 24}V hold`
        : component.type === 'key_interlock'
          ? component.state === 'on'
            ? 'closed'
            : 'open'
          : component.type === 'neutral_link'
            ? 'neutral bar'
            : component.type === 'earth_link'
              ? 'protective earth'
              : component.type === 'current_transformer'
                ? `${component.properties.meterCtPrimary ?? 100}/5A`
                : component.type === 'voltage_transformer'
                  ? `${component.properties.phaseVoltage ?? 230}/${component.properties.voltage ?? 110}V`
                  : component.type === 'din_rail'
                    ? 'mounting rail'
                    : component.type === 'mounting_plate'
                      ? 'back panel'
                      : component.type === 'cable_duct'
                        ? 'wire trunking'
                        : component.type === 'busbar_support_insulator'
                          ? 'insulator support'
                        : component.type === 'ferrule_cable_markers'
                          ? 'wire id markers'
                        : component.type === 'control_wiring'
                          ? '1.5/2.5 sqmm'
                        : component.type === 'power_cables'
                          ? 'load sized'
                        : component.type === 'ms_gi_sheet_enclosure'
                          ? 'sheet-metal panel'
                        : component.type === 'ip_rated_enclosure'
                          ? 'IP54/IP65'
                  : component.type === 'power_quality_analyzer'
                    ? 'harmonics/events'
        : 'terminal strip';

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
            x={-32}
            y={-24}
            width={64}
            height={48}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[4, 4]}
            cornerRadius={4}
          />
        )}
        <Rect
          x={-28}
          y={-20}
          width={56}
          height={40}
          fillLinearGradientStartPoint={{ x: 0, y: -20 }}
          fillLinearGradientEndPoint={{ x: 0, y: 20 }}
          fillLinearGradientColorStops={
            energized
              ? [0, '#F8FAFC', 0.55, '#ECFDF5', 1, '#DCFCE7']
              : [0, '#F8FAFC', 1, '#E5E7EB']
          }
          stroke={energized ? '#16A34A' : '#6B7280'}
          strokeWidth={OUTLINE}
          cornerRadius={4}
          shadowColor="#0F172A"
          shadowBlur={4}
          shadowOpacity={0.2}
          shadowOffsetY={1}
        />
        <Rect x={-28} y={-20} width={56} height={5} fill={accentColor} cornerRadius={4} />
        <Text
          text={title}
          x={-26}
          y={-12}
          width={52}
          align="center"
          fontSize={9}
          fontStyle="bold"
          fill="#14532D"
          listening={false}
        />
        <Text
          text={subtitle}
          x={-26}
          y={2}
          width={52}
          align="center"
          fontSize={7}
          fill="#4B5563"
          listening={false}
        />
        {isPriorityDevice && (
          <>
            {(component.type === 'shunt_trip_coil' ||
              component.type === 'closing_coil' ||
              component.type === 'uvr_release') && (
              <Line
                points={[-14, 8, -10, 4, -6, 12, -2, 4, 2, 12, 6, 4, 10, 12, 14, 8]}
                stroke="#B91C1C"
                strokeWidth={1.2}
                listening={false}
              />
            )}
            {(component.type === 'current_transformer' ||
              component.type === 'voltage_transformer') && (
              <>
                <Circle x={-8} y={8} radius={4} stroke="#6D28D9" strokeWidth={1.2} fill="#F5F3FF" />
                <Circle x={8} y={8} radius={4} stroke="#6D28D9" strokeWidth={1.2} fill="#F5F3FF" />
                <Line points={[-4, 8, 4, 8]} stroke="#6D28D9" strokeWidth={1.2} listening={false} />
              </>
            )}
            {component.type === 'power_quality_analyzer' && (
              <>
                <Line points={[-16, 12, -8, 7, -1, 11, 8, 5, 16, 9]} stroke="#0284C7" strokeWidth={1.4} />
                <Text
                  text="THD"
                  x={-10}
                  y={10}
                  width={20}
                  align="center"
                  fontSize={5}
                  fill="#0C4A6E"
                  listening={false}
                />
              </>
            )}
          </>
        )}
        {energized && <Circle x={20} y={-12} radius={2.8} fill="#22C55E" />}
        <ComponentCanvasLabel
          componentId={component.id}
          label={component.label}
          x={-32}
          y={26}
          width={64}
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

export default PowerAuxSymbol;

