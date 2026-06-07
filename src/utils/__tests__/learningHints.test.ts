import { describe, expect, it } from 'vitest';
import { learningHintForIssue } from '../learningHints';
import type { CircuitValidationIssue } from '../circuitDesignValidation';

describe('learningHintForIssue', () => {
  it('returns an exact hint for known issue ids', () => {
    const issue: CircuitValidationIssue = {
      id: 'source-missing',
      severity: 'error',
      message: 'No supply',
      componentIds: [],
    };
    expect(learningHintForIssue(issue)).toContain('supply symbol');
  });

  it('returns prefix hints for load wiring issues', () => {
    const issue: CircuitValidationIssue = {
      id: 'load-unwired-l1',
      severity: 'error',
      message: 'Unwired',
      componentIds: ['l1'],
    };
    expect(learningHintForIssue(issue)).toContain('complete path');
  });

  it('falls back to severity guidance', () => {
    const issue: CircuitValidationIssue = {
      id: 'custom-unknown-code',
      severity: 'warning',
      message: 'Something odd',
      componentIds: [],
    };
    expect(learningHintForIssue(issue)).toContain('worth checking');
  });
});
