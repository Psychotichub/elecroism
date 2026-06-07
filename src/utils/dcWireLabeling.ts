import type { Wire, WireColor } from '../types';
import { isDcPositiveLabel, isDcNegativeLabel } from '../simulation/dcPowerPaths';

export type DcWirePolarity = 'dc_plus' | 'dc_minus' | 'dc_return' | 'not_dc';

const DC_COLOR_LABELS: Record<WireColor, string> = {
  brown: 'BN (AC L)',
  blue: 'BU (N / DC return)',
  green_yellow: 'GNYE (PE)',
  black: 'BK (−)',
  grey: 'GY (L3)',
  red: 'RD (+)',
  ethernet: 'ETH',
};

/**
 * Classify whether a wire is a DC positive, negative, or return leg from terminal labels.
 */
export function classifyDcWirePolarity(
  fromLabel: string,
  toLabel: string
): DcWirePolarity {
  const fromPos = isDcPositiveLabel(fromLabel);
  const toPos = isDcPositiveLabel(toLabel);
  const fromNeg = isDcNegativeLabel(fromLabel);
  const toNeg = isDcNegativeLabel(toLabel);

  if (fromPos || toPos) return 'dc_plus';
  if (fromNeg || toNeg) return 'dc_minus';

  const u = `${fromLabel} ${toLabel}`.toUpperCase();
  if (/\b(PWR_0V|DC_MINUS|BAT_NEG|0V)\b/.test(u)) return 'dc_return';
  return 'not_dc';
}

/** IEC / industry export label for conductor colour on DC runs. */
export function dcWireExportColorLabel(color: WireColor): string {
  return DC_COLOR_LABELS[color] ?? color;
}

/** Human-readable polarity tag for wire schedules and BOM exports. */
export function dcWireExportPolarityLabel(
  fromLabel: string,
  toLabel: string
): string {
  const pol = classifyDcWirePolarity(fromLabel, toLabel);
  switch (pol) {
    case 'dc_plus':
      return '+';
    case 'dc_minus':
      return '−';
    case 'dc_return':
      return '0V';
    default:
      return '';
  }
}

/** Suggested wire colour when drawing DC paths (for validation hints). */
export function recommendedDcWireColor(
  fromLabel: string,
  toLabel: string
): WireColor | null {
  const pol = classifyDcWirePolarity(fromLabel, toLabel);
  if (pol === 'dc_plus') return 'red';
  if (pol === 'dc_minus' || pol === 'dc_return') return 'black';
  return null;
}

export function wireUsesDcColorConvention(wire: Wire, fromLabel: string, toLabel: string): boolean {
  const pol = classifyDcWirePolarity(fromLabel, toLabel);
  if (pol === 'not_dc') return true;
  const expected = recommendedDcWireColor(fromLabel, toLabel);
  if (!expected) return true;
  return wire.color === expected || wire.color === 'blue'; // blue 0V return is common on panels
}

export function buildDcWireExportFields(
  wire: Wire,
  fromLabel: string,
  toLabel: string
): {
  dcPolarity: string;
  exportColorLabel: string;
  dcColorOk: string;
} {
  const pol = classifyDcWirePolarity(fromLabel, toLabel);
  return {
    dcPolarity: dcWireExportPolarityLabel(fromLabel, toLabel),
    exportColorLabel: dcWireExportColorLabel(wire.color),
    dcColorOk:
      pol === 'not_dc' || wireUsesDcColorConvention(wire, fromLabel, toLabel)
        ? 'yes'
        : 'check',
  };
}
