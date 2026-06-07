import { describe, expect, it } from 'vitest';
import type { Circuit, ReviewCommentThread } from '../../types';
import { makeCircuit, makeComponent } from '../../simulation/__tests__/testHelpers';
import {
  createReviewThread,
  formatReviewAnchorLabel,
  openReviewThreadCount,
  resolveReviewAnchor,
  sortReviewThreads,
} from '../reviewComments';
import {
  buildReviewCommentsJson,
  buildReviewCommentsPdf,
} from '../reviewCommentsExport';

describe('reviewComments', () => {
  it('resolves component anchor from live component position', () => {
    const comp = makeComponent('mcb', { x: 120, y: 80, label: 'Q1' });
    const circuit = makeCircuit([comp], []);
    const thread = createReviewThread({
      anchorType: 'component',
      componentId: comp.id,
      worldX: 0,
      worldY: 0,
      body: 'Check rating',
    });
    const anchor = resolveReviewAnchor(circuit, thread);
    expect(anchor.label).toBe('Q1');
    expect(anchor.x).toBe(comp.x + 24);
  });

  it('sorts open threads before resolved', () => {
    const open = createReviewThread({
      anchorType: 'point',
      worldX: 1,
      worldY: 2,
      body: 'Open issue',
    });
    const resolved: ReviewCommentThread = {
      ...createReviewThread({
        anchorType: 'point',
        worldX: 3,
        worldY: 4,
        body: 'Done',
      }),
      status: 'resolved',
      updatedAt: '2026-06-08T00:00:00.000Z',
    };
    const sorted = sortReviewThreads([resolved, open]);
    expect(sorted[0].status).toBe('open');
  });

  it('counts open threads', () => {
    const circuit: Circuit = {
      ...makeCircuit([], []),
      reviewComments: [
        createReviewThread({
          anchorType: 'point',
          worldX: 0,
          worldY: 0,
          body: 'A',
        }),
        {
          ...createReviewThread({
            anchorType: 'point',
            worldX: 1,
            worldY: 1,
            body: 'B',
          }),
          status: 'resolved',
        },
      ],
    };
    expect(openReviewThreadCount(circuit)).toBe(1);
    expect(formatReviewAnchorLabel(circuit, circuit.reviewComments![0])).toBe(
      'Canvas point'
    );
  });

  it('builds review JSON and PDF exports', () => {
    const comp = makeComponent('contactor', { label: 'K1' });
    const circuit: Circuit = {
      ...makeCircuit([comp], []),
      name: 'Feeder sheet',
      reviewComments: [
        createReviewThread({
          anchorType: 'component',
          componentId: comp.id,
          worldX: comp.x,
          worldY: comp.y,
          body: 'Verify coil voltage',
          author: 'JD',
        }),
      ],
    };
    const project = { name: 'Site project', titleBlock: { client: 'Client' } };
    const json = buildReviewCommentsJson(circuit, project);
    expect(json.version).toBe('1.0');
    expect(json.threads).toHaveLength(1);
    expect(json.threads[0].anchorLabel).toBe('K1');
    const pdf = buildReviewCommentsPdf(circuit, project);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
