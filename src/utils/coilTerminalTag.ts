/**
 * Map a connection-point label to coil side for on-symbol A1/A2 tags.
 * Accepts IEC-style names and common import variants (dashes, spaces, COIL_A/B, COIL1/2).
 */
export function coilTerminalTag(label: string): 'A1' | 'A2' | null {
  const raw = label.trim().toUpperCase();
  if (raw === 'COIL_A') return 'A1';
  if (raw === 'COIL_B') return 'A2';
  const n = raw.replace(/[\s\-_]/g, '');
  if (n === 'A1' || n === 'COILA' || n === 'COIL1') return 'A1';
  if (n === 'A2' || n === 'COILB' || n === 'COIL2') return 'A2';
  if (/^A0*1$/.test(n)) return 'A1';
  if (/^A0*2$/.test(n)) return 'A2';
  return null;
}
