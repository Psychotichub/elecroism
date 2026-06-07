import type { ReviewCommentThread } from '../../types';
import {
  createReviewMessage,
  createReviewThread,
} from '../../utils/reviewComments';
import {
  downloadReviewCommentsJson,
  downloadReviewCommentsPdf,
} from '../../utils/reviewCommentsExport';
import type { CircuitStoreGet, CircuitStoreSet } from './sliceTypes';

function patchThreads(
  threads: ReviewCommentThread[],
  id: string,
  patch: Partial<ReviewCommentThread>
): ReviewCommentThread[] {
  const now = new Date().toISOString();
  return threads.map((t) =>
    t.id === id ? { ...t, ...patch, updatedAt: now } : t
  );
}

export function createReviewCommentActions(
  set: CircuitStoreSet,
  get: CircuitStoreGet
) {
  return {
    addReviewCommentAtPoint: (
      worldX: number,
      worldY: number,
      body: string,
      author?: string
    ) => {
      const text = body.trim();
      if (!text) return null;
      const thread = createReviewThread({
        anchorType: 'point',
        worldX,
        worldY,
        body: text,
        author,
      });
      set((state) => ({
        circuit: {
          ...state.circuit,
          reviewComments: [...(state.circuit.reviewComments ?? []), thread],
          updatedAt: new Date().toISOString(),
        },
      }));
      return thread.id;
    },

    addReviewCommentOnComponent: (
      componentId: string,
      body: string,
      author?: string
    ) => {
      const text = body.trim();
      if (!text) return null;
      const { circuit } = get();
      const comp = circuit.components.find((c) => c.id === componentId);
      if (!comp) return null;
      const thread = createReviewThread({
        anchorType: 'component',
        componentId,
        worldX: comp.x,
        worldY: comp.y,
        body: text,
        author,
      });
      set((state) => ({
        circuit: {
          ...state.circuit,
          reviewComments: [...(state.circuit.reviewComments ?? []), thread],
          updatedAt: new Date().toISOString(),
        },
      }));
      return thread.id;
    },

    addReviewCommentReply: (
      threadId: string,
      body: string,
      author?: string
    ) => {
      const text = body.trim();
      if (!text) return false;
      const message = createReviewMessage(text, author);
      set((state) => {
        const threads = state.circuit.reviewComments ?? [];
        if (!threads.some((t) => t.id === threadId)) return state;
        return {
          circuit: {
            ...state.circuit,
            reviewComments: patchThreads(threads, threadId, {
              messages: [
                ...(threads.find((t) => t.id === threadId)?.messages ?? []),
                message,
              ],
              status: 'open',
            }),
            updatedAt: new Date().toISOString(),
          },
        };
      });
      return true;
    },

    resolveReviewCommentThread: (threadId: string) => {
      set((state) => ({
        circuit: {
          ...state.circuit,
          reviewComments: patchThreads(
            state.circuit.reviewComments ?? [],
            threadId,
            { status: 'resolved' }
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    reopenReviewCommentThread: (threadId: string) => {
      set((state) => ({
        circuit: {
          ...state.circuit,
          reviewComments: patchThreads(
            state.circuit.reviewComments ?? [],
            threadId,
            { status: 'open' }
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    deleteReviewCommentThread: (threadId: string) => {
      set((state) => ({
        circuit: {
          ...state.circuit,
          reviewComments: (state.circuit.reviewComments ?? []).filter(
            (t) => t.id !== threadId
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    exportReviewCommentsPdf: () => {
      const { circuit, project } = get();
      if ((circuit.reviewComments ?? []).length === 0) {
        return 'No review comments on this sheet.';
      }
      try {
        downloadReviewCommentsPdf(circuit, project);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Review PDF export failed.';
      }
    },

    exportReviewCommentsJson: () => {
      const { circuit, project } = get();
      try {
        downloadReviewCommentsJson(circuit, project);
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : 'Review JSON export failed.';
      }
    },
  };
}
