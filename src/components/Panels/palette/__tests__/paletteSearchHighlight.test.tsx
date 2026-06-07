/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { highlightSearchMatch } from '../paletteSearchHighlight';

describe('highlightSearchMatch', () => {
  it('returns plain text when query is empty', () => {
    expect(highlightSearchMatch('MCB', '')).toBe('MCB');
  });

  it('wraps matching substring in a mark element', () => {
    render(<span>{highlightSearchMatch('3P MCB', 'MCB')}</span>);
    const mark = screen.getByText('MCB');
    expect(mark.tagName).toBe('MARK');
    expect(mark.className).toContain('es-palette-search-hit');
  });

  it('is case-insensitive', () => {
    render(<span>{highlightSearchMatch('Contactor', 'cont')}</span>);
    expect(screen.getByText('Cont').tagName).toBe('MARK');
  });
});
