/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Card from '../Card';

describe('Card', () => {
  it('renders learning variant with content', () => {
    render(
      <Card variant="learning" as="section" aria-label="Learning card">
        <p>Panel body</p>
      </Card>
    );
    const card = screen.getByLabelText('Learning card');
    expect(card.className).toContain('es-card-learning');
    expect(screen.getByText('Panel body')).toBeInTheDocument();
  });
});
