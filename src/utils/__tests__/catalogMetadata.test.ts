import { describe, expect, it } from 'vitest';
import {
  difficultyLabel,
  formatEstimatedMinutes,
} from '../catalogMetadata';

describe('catalogMetadata', () => {
  it('labels difficulty tiers', () => {
    expect(difficultyLabel('beginner')).toBe('Beginner');
    expect(difficultyLabel('intermediate')).toBe('Intermediate');
    expect(difficultyLabel('advanced')).toBe('Advanced');
  });

  it('formats estimated minutes', () => {
    expect(formatEstimatedMinutes(15)).toBe('~15 min');
    expect(formatEstimatedMinutes(60)).toBe('~1h');
    expect(formatEstimatedMinutes(90)).toBe('~1h 30m');
  });
});
