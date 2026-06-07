import { v4 as uuid } from 'uuid';
import type {
  Circuit,
  ReviewCommentMessage,
  ReviewCommentThread,
} from '../types';

export type ResolvedReviewAnchor = {
  x: number;
  y: number;
  label: string;
};

export function reviewThreads(circuit: Circuit): ReviewCommentThread[] {
  return circuit.reviewComments ?? [];
}

export function openReviewThreadCount(circuit: Circuit): number {
  return reviewThreads(circuit).filter((t) => t.status === 'open').length;
}

export function resolveReviewAnchor(
  circuit: Circuit,
  thread: ReviewCommentThread
): ResolvedReviewAnchor {
  if (thread.anchorType === 'component' && thread.componentId) {
    const comp = circuit.components.find((c) => c.id === thread.componentId);
    if (comp) {
      return {
        x: comp.x + 24,
        y: comp.y - 12,
        label: comp.label?.trim() || comp.type,
      };
    }
  }
  return {
    x: thread.worldX,
    y: thread.worldY,
    label: 'Canvas point',
  };
}

export function sortReviewThreads(
  threads: ReviewCommentThread[]
): ReviewCommentThread[] {
  return [...threads].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'open' ? -1 : 1;
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function createReviewMessage(
  body: string,
  author?: string
): ReviewCommentMessage {
  return {
    id: uuid(),
    body: body.trim(),
    author: author?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
}

export function createReviewThread(input: {
  anchorType: ReviewCommentThread['anchorType'];
  componentId?: string;
  worldX: number;
  worldY: number;
  body: string;
  author?: string;
}): ReviewCommentThread {
  const now = new Date().toISOString();
  const message = createReviewMessage(input.body, input.author);
  return {
    id: uuid(),
    anchorType: input.anchorType,
    componentId: input.componentId,
    worldX: input.worldX,
    worldY: input.worldY,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    author: input.author?.trim() || undefined,
    messages: [message],
  };
}

export function threadPreviewText(thread: ReviewCommentThread): string {
  const first = thread.messages[0]?.body ?? '';
  if (first.length <= 72) return first;
  return `${first.slice(0, 69)}…`;
}

export function formatReviewAnchorLabel(
  circuit: Circuit,
  thread: ReviewCommentThread
): string {
  return resolveReviewAnchor(circuit, thread).label;
}
