import type { CircuitValidationIssue } from './circuitDesignValidation';

const EXACT_HINTS: Record<string, string> = {
  'source-missing':
    'Every load needs a supply symbol (AC source, 3φ supply, DC supply, or SMPS). Without one, the simulator cannot energize the circuit.',
};

const PREFIX_HINTS: [string, string][] = [
  [
    'load-unwired',
    'A load needs wires on both terminals to form a complete path from live to return (or neutral).',
  ],
  [
    'load-return',
    'Single-phase loads expect live on T1 and neutral/return on T2. Swap wires or add a neutral link if the return path is missing.',
  ],
  [
    'isc-capacity',
    'Breaking capacity (Icu/Icn) must exceed the maximum prospective short-circuit current at that point. Use a higher kA rated device or reduce fault level upstream.',
  ],
  [
    'isc-over',
    'During a simulated bolted fault, current through this device exceeds what it is rated to interrupt. Upgrade breaking capacity or add impedance upstream.',
  ],
  [
    'isc-margin',
    'High fault or overload current relative to breaking capacity — check cable impedance, source size, and selectivity with upstream devices.',
  ],
  [
    'phase-imbalance',
    'Three-phase motors run best when phase currents are balanced. Large imbalance causes heating and can trip overload relays.',
  ],
  [
    'bms-',
    'BMS close/trip commands are blocked until control voltage, spring charge, and interlocks are satisfied — same as on a real switchboard.',
  ],
  [
    'comm-duplicate',
    'Two devices cannot share the same fieldbus address on one network. Change slave ID, IP, or BACnet instance.',
  ],
  [
    'designator-dup',
    'Every device tag on the drawing should be unique so wire schedules, BOMs, and as-built docs stay unambiguous. Use Validation → Renumber or edit labels manually.',
  ],
  [
    'coordination-',
    'Downstream protection should trip before upstream devices for selective isolation. Check trip curves and current settings.',
  ],
  [
    'zs-over-',
    'Earth-fault loop impedance Zs is too high for this MCB/fuse to disconnect within the required time. Use shorter runs, larger cable, or a lower-rated device with suitable max Zs.',
  ],
  [
    'zs-slow-',
    'Fault current is too low to rely on the magnetic (instantaneous) trip band — the device may take too long to clear a fault. Reduce Zs or upgrade trip curve.',
  ],
  [
    'zs-margin-',
    'Zs is within limits but has little headroom. Cable heating or supply voltage dip could push the circuit out of compliance.',
  ],
  [
    'arcflash-cat4-',
    'Incident energy exceeds Category 4 PPE — do not work energized without a full arc-flash study and written procedure.',
  ],
  [
    'arcflash-high-',
    'Elevated arc-flash energy — wear rated PPE, respect the arc-flash boundary, and post a label at the equipment.',
  ],
  [
    'pq-neutral-harmonic',
    'Triplen (3rd, 9th, …) harmonics from VFDs and SMPS add in the neutral instead of cancelling. Size the neutral for 173% of phase current on harmonic-heavy boards, or use a delta winding.',
  ],
  [
    'pq-high-thd',
    'High THD increases RMS current without extra real power — breakers and cables must be sized on measured RMS, not fundamental current alone.',
  ],
  [
    'pq-rms-',
    'Harmonic distortion raises RMS current above the fundamental. Check device ratings and consider line reactors or active filters.',
  ],
];

export function learningHintForIssue(
  issue: CircuitValidationIssue
): string | null {
  if (EXACT_HINTS[issue.id]) return EXACT_HINTS[issue.id];
  for (const [prefix, hint] of PREFIX_HINTS) {
    if (issue.id === prefix || issue.id.startsWith(prefix)) return hint;
  }
  if (issue.severity === 'error') {
    return 'This is a design error that can prevent safe operation or realistic simulation. Fix wiring, ratings, or device settings before commissioning.';
  }
  if (issue.severity === 'warning') {
    return 'This may work in some cases but is worth checking against your panel schedule and local wiring rules.';
  }
  return null;
}
