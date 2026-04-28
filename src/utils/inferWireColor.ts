import type { WireColor } from '../types';

/** Neutral legs: explicit patterns before generic `L` rules (e.g. IN_L = line). */
function labelImpliesNeutral(label: string): boolean {
  const u = label.toUpperCase().trim();
  if (!u) return false;
  if (u === 'N') return true;
  return /\b(IN_N|OUT_N|N_OUT|AC_N|SEC_N|PWR_N|NEUTRAL)\b/.test(u);
}

function labelImpliesEarth(label: string): boolean {
  const u = label.toUpperCase();
  return /\b(PE|EARTH|GROUND)\b/.test(u);
}

function tokenize(label: string): string[] {
  return label
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
}

function inferFromTokens(tokens: string[]): WireColor | null {
  const has = (t: string) => tokens.includes(t);

  if (has('PE') || has('EARTH') || has('GROUND')) {
    return 'green_yellow';
  }

  if (has('L1') || has('PHASE1')) return 'brown';
  if (has('L2') || has('PHASE2')) return 'black';
  if (has('L3') || has('PHASE3')) return 'grey';

  if (has('DC') && has('PLUS')) return 'red';
  if (has('DC') && has('MINUS')) return 'black';

  if (has('L') || has('PHASE') || has('LINE')) return 'brown';

  return null;
}

/**
 * IEC-style conductor colour from terminal labels at each end.
 */
export function inferWireColor(
  fromLabel: string,
  toLabel: string
): WireColor {
  if (labelImpliesEarth(fromLabel) || labelImpliesEarth(toLabel)) {
    return 'green_yellow';
  }

  if (labelImpliesNeutral(fromLabel) || labelImpliesNeutral(toLabel)) {
    return 'blue';
  }

  const tokens = [...tokenize(fromLabel), ...tokenize(toLabel)];
  const fromTokens = inferFromTokens(tokens);
  if (fromTokens) return fromTokens;

  return 'brown';
}

/** When starting a wire from one terminal only (preview / wip colour). */
export function inferWireColorFromSingleTerminal(label: string): WireColor {
  return inferWireColor(label, '');
}
