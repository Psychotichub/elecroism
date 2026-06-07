import React, { useMemo } from 'react';
import { Circle, Group, Line, Rect, Text } from 'react-konva';
import type { Theme } from '../../store/themeStore';
import type { Circuit } from '../../types';
import type { CircuitValidationIssue } from '../../utils/circuitDesignValidation';
import { getCanvasTokens } from '../../design/tokens';
import { learningHintForIssue } from '../../utils/learningHints';
import {
  severityStroke,
  validationMarkersForIssues,
} from '../../utils/validationFocus';

type Props = {
  circuit: Circuit;
  issues: CircuitValidationIssue[];
  focusedIssueId: string | null;
  learningMode: boolean;
  theme: Theme;
  panX: number;
  panY: number;
  zoom: number;
};

function wrapHint(text: string, maxLen = 72): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLen && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

const ValidationHintsOverlay: React.FC<Props> = ({
  circuit,
  issues,
  focusedIssueId,
  learningMode,
  theme,
  panX,
  panY,
  zoom,
}) => {
  const callout = getCanvasTokens(theme);

  const markers = useMemo(
    () => validationMarkersForIssues(circuit, issues),
    [circuit, issues]
  );

  const focusedIssue = useMemo(
    () => issues.find((i) => i.id === focusedIssueId) ?? null,
    [issues, focusedIssueId]
  );

  const focusedMarker = useMemo(
    () => markers.find((m) => m.issueId === focusedIssueId) ?? null,
    [markers, focusedIssueId]
  );

  const hintLines = useMemo(() => {
    if (!learningMode || !focusedIssue) return [];
    const hint = learningHintForIssue(focusedIssue);
    return hint ? wrapHint(hint) : [];
  }, [learningMode, focusedIssue]);

  if (markers.length === 0) return null;

  const showAllMarkers = learningMode;
  const showFocus = focusedIssueId != null;

  if (!showAllMarkers && !showFocus) return null;

  const padX = 10;
  const padY = 8;
  const lineHeight = 14;
  const bubbleWidth =
    hintLines.length > 0
      ? Math.min(
          280,
          Math.max(...hintLines.map((line) => line.length * 5.5)) + padX * 2
        )
      : 0;
  const bubbleHeight =
    hintLines.length > 0 ? hintLines.length * lineHeight + padY * 2 : 0;
  const pointerTip = 10;
  const pointerBase = 6;
  const bubbleOffset = pointerTip + 4;

  return (
    <Group listening={false} x={panX} y={panY} scaleX={zoom} scaleY={zoom}>
      {showAllMarkers
        ? markers.map((m) => {
            const focused = m.issueId === focusedIssueId;
            const stroke = severityStroke(m.severity);
            return (
              <Circle
                key={m.issueId}
                x={m.x}
                y={m.y}
                radius={focused ? 11 : 8}
                stroke={stroke}
                strokeWidth={focused ? 2.5 : 2}
                fill={`${stroke}22`}
                dash={focused ? undefined : [4, 3]}
              />
            );
          })
        : null}

      {showFocus && focusedMarker && !showAllMarkers ? (
        <Circle
          x={focusedMarker.x}
          y={focusedMarker.y}
          radius={12}
          stroke={severityStroke(focusedMarker.severity)}
          strokeWidth={2.5}
          fill="rgba(251,191,36,0.16)"
        />
      ) : null}

      {hintLines.length > 0 && focusedMarker ? (
        <Group x={focusedMarker.x} y={focusedMarker.y}>
          <Line
            points={[
              pointerTip,
              0,
              bubbleOffset,
              -pointerBase,
              bubbleOffset,
              pointerBase,
            ]}
            closed
            fill={callout.hintBubbleFill}
            stroke={callout.hintBubbleStroke}
            strokeWidth={1}
            lineJoin="round"
          />
          <Rect
            x={bubbleOffset}
            y={-bubbleHeight / 2}
            width={bubbleWidth}
            height={bubbleHeight}
            fill={callout.hintBubbleFill}
            stroke={callout.hintBubbleStroke}
            strokeWidth={1}
            cornerRadius={6}
            shadowColor="rgba(0,0,0,0.18)"
            shadowBlur={8}
            shadowOffsetY={2}
            shadowOpacity={0.35}
          />
          <Text
            x={bubbleOffset + padX}
            y={-bubbleHeight / 2 + padY - 1}
            text={hintLines.join('\n')}
            fontSize={11}
            lineHeight={1.3}
            fill={callout.hintText}
            width={bubbleWidth - padX * 2}
          />
        </Group>
      ) : null}
    </Group>
  );
};

export default ValidationHintsOverlay;
