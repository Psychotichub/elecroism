import React from 'react';
import { Circle, Group, Line, Rect, Text } from 'react-konva';
import type { Circuit } from '../../types';
import { resolveReviewAnchor, reviewThreads } from '../../utils/reviewComments';

type Props = {
  circuit: Circuit;
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
};

const ReviewCommentsLayer: React.FC<Props> = ({
  circuit,
  activeThreadId,
  onSelectThread,
}) => {
  const threads = reviewThreads(circuit);
  if (threads.length === 0) return null;

  return (
    <Group>
      {threads.map((thread, index) => {
        const anchor = resolveReviewAnchor(circuit, thread);
        const isActive = thread.id === activeThreadId;
        const isOpen = thread.status === 'open';
        const pinColor = isOpen ? '#F59E0B' : '#64748B';
        const fill = isOpen ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.2)';

        return (
          <Group
            key={thread.id}
            x={anchor.x}
            y={anchor.y}
            onClick={(e) => {
              e.cancelBubble = true;
              onSelectThread(thread.id);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              onSelectThread(thread.id);
            }}
          >
            <Line
              points={[0, 0, -10, 14]}
              stroke={pinColor}
              strokeWidth={1.2}
              listening={false}
            />
            <Circle
              x={0}
              y={0}
              radius={isActive ? 11 : 9}
              fill={fill}
              stroke={isActive ? '#FBBF24' : pinColor}
              strokeWidth={isActive ? 2 : 1.2}
            />
            <Text
              x={-5}
              y={-4}
              width={10}
              text={String(index + 1)}
              fontSize={7}
              fontStyle="bold"
              fill={isOpen ? '#FDE68A' : '#CBD5E1'}
              align="center"
            />
            {isActive ? (
              <Rect
                x={-14}
                y={-14}
                width={28}
                height={28}
                stroke="#FBBF24"
                strokeWidth={1}
                dash={[3, 2]}
                listening={false}
              />
            ) : null}
          </Group>
        );
      })}
    </Group>
  );
};

export default ReviewCommentsLayer;
