import { describe, expect, it } from 'vitest';
import {
  eventToShortcut,
  matchesShortcut,
  normalizeShortcut,
} from '../shortcutMatching';

function keyEvent(init: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}): KeyboardEvent {
  return {
    key: init.key,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    shiftKey: init.shiftKey ?? false,
    altKey: init.altKey ?? false,
  } as KeyboardEvent;
}

describe('shortcutMatching', () => {
  it('normalizes modifier order and casing', () => {
    expect(normalizeShortcut('Ctrl+Shift+Z')).toBe('ctrl+shift+z');
    expect(normalizeShortcut('Meta+S')).toBe('ctrl+s');
  });

  it('matches Ctrl+Z across meta and control', () => {
    const binding = 'Ctrl+Z';
    expect(matchesShortcut(keyEvent({ key: 'z', ctrlKey: true }), binding)).toBe(
      true
    );
    expect(matchesShortcut(keyEvent({ key: 'z', metaKey: true }), binding)).toBe(
      true
    );
  });

  it('encodes space and function keys', () => {
    expect(eventToShortcut(keyEvent({ key: ' ' }))).toBe('Space');
    expect(eventToShortcut(keyEvent({ key: 'F3' }))).toBe('F3');
  });
});
