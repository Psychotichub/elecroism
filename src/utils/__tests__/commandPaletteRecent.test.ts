/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  loadRecentPaletteIds,
  recordPaletteSelection,
} from '../commandPaletteRecent';

const KEY = 'electroism.commandPaletteRecent.v1';

describe('commandPaletteRecent', () => {
  afterEach(() => {
    window.localStorage.removeItem(KEY);
  });

  it('records and dedupes recent palette selections', () => {
    recordPaletteSelection('action-select-unwired');
    recordPaletteSelection('comp-abc');
    recordPaletteSelection('action-select-unwired');
    expect(loadRecentPaletteIds()).toEqual(['action-select-unwired', 'comp-abc']);
  });
});
