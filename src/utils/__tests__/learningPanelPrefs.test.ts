/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadLearningPanelPrefs,
  saveLearningPanelPrefs,
} from '../learningPanelPrefs';

const KEY = 'electroism.learningPanel.v1';

describe('learningPanelPrefs', () => {
  afterEach(() => {
    window.localStorage.removeItem(KEY);
  });

  it('defaults to docked and pinned', () => {
    expect(loadLearningPanelPrefs()).toEqual({
      placement: 'dock',
      pinned: true,
    });
  });

  it('persists floating placement', () => {
    saveLearningPanelPrefs({ placement: 'floating', pinned: false });
    expect(loadLearningPanelPrefs()).toEqual({
      placement: 'floating',
      pinned: false,
    });
  });
});
