/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CatalogMetaChips from '../CatalogMetaChips';
import type { CatalogMetadata } from '../../../utils/catalogMetadata';

const meta: CatalogMetadata = {
  difficulty: 'beginner',
  estimatedMinutes: 15,
  prerequisites: ['basics'],
};

describe('CatalogMetaChips', () => {
  it('renders difficulty and duration using Chip primitives', () => {
    const { container } = render(<CatalogMetaChips meta={meta} />);
    expect(screen.getByText('Beginner')).toBeTruthy();
    expect(screen.getByText('~15 min')).toBeTruthy();
    expect(screen.getByText(/Prereq: basics/)).toBeTruthy();
    const chips = container.querySelectorAll('span.rounded-full');
    expect(chips.length).toBeGreaterThanOrEqual(2);
  });
});
