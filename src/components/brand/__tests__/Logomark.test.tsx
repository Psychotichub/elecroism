/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Logomark from '../Logomark';
import {
  LOGOMARK_BG_HEX,
  LOGOMARK_BOLT_HEX,
  LOGOMARK_BOLT_PATH,
} from '../../../design/logomarkPaths';

describe('Logomark', () => {
  it('renders branded bolt geometry', () => {
    const { container } = render(<Logomark size={16} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('width')).toBe('16');
    expect(svg?.getAttribute('aria-label')).toBe('ElectroSim');
    expect(container.querySelector('rect')?.getAttribute('fill')).toBe(
      LOGOMARK_BG_HEX
    );
    expect(container.querySelector('path')?.getAttribute('fill')).toBe(
      LOGOMARK_BOLT_HEX
    );
    expect(container.querySelector('path')?.getAttribute('d')).toBe(
      LOGOMARK_BOLT_PATH
    );
  });

  it('can render decoratively without accessible name', () => {
    const { container } = render(<Logomark size={12} aria-hidden />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('aria-label')).toBeNull();
  });
});
