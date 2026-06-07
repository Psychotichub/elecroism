import React, { useMemo } from 'react';
import { Circle, Group, Rect, Text } from 'react-konva';
import type { Circuit } from '../../types';
import type { CircuitValidationIssue } from '../../utils/circuitDesignValidation';
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
  panX,
  panY,
  zoom,
}) => {
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
                strokeWidth={focused ? 3 : 2}
                fill={`${stroke}33`}
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
          strokeWidth={3}
          fill="rgba(251,191,36,0.2)"
        />
      ) : null}

      {hintLines.length > 0 && focusedMarker ? (
        <Group x={focusedMarker.x + 14} y={focusedMarker.y - 8}>
          <Rect
            x={0}
            y={0}
            width={Math.min(280, Math.max(...hintLines.map((l) => l.length * 5.5)) + 16)}
            height={hintLines.length * 14 + 10}
            fill="rgba(15,23,42,0.92)"
            stroke="#38bdf8"
            strokeWidth={1}
            cornerRadius={4}
          />
          <Text
            x={8}
            y={5}
            text={hintLines.join('\n')}
            fontSize={11}
            lineHeight={1.25}
            fill="#e0f2fe"
            width={264}
          />
        </Group>
      ) : null}
    </Group>
  );
};

export default ValidationHintsOverlay;
