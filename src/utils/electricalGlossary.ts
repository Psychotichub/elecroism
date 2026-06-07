export type GlossaryEntry = {
  id: string;
  term: string;
  category: string;
  definition: string;
  /** Optional ids of related glossary entries for cross-reference. */
  seeAlso?: string[];
};

export const GLOSSARY_CATEGORIES = [
  'Protection',
  'Symbol standards',
  'Motor control',
  'Earthing & safety',
  'Distribution',
] as const;

export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];

export const ELECTRICAL_GLOSSARY: GlossaryEntry[] = [
  {
    id: 'mcb',
    term: 'MCB (miniature circuit breaker)',
    category: 'Protection',
    definition:
      'Thermal-magnetic breaker for final circuits, typically up to ~125 A in molded DIN-rail or plug-in form. In ElectroSim, MCB symbols trip on overload and short-circuit; use for lighting, socket, and small machine branches.',
    seeAlso: ['mccb', 'mpcb', 'iec-tagging'],
  },
  {
    id: 'mccb',
    term: 'MCCB (molded case circuit breaker)',
    category: 'Protection',
    definition:
      'Larger molded-case breaker for feeders and sub-mains — higher current and breaking capacity than an MCB, often adjustable thermal settings. Symbol shows multi-pole main contacts; suited to distribution boards and motor feeders above MCB range.',
    seeAlso: ['mcb', 'mpcb', 'acb'],
  },
  {
    id: 'mpcb',
    term: 'MPCB (motor protection circuit breaker)',
    category: 'Protection',
    definition:
      'Breaker dedicated to motor circuits: combines short-circuit clearance with motor overload (often Class 10A/20). Functionally between MCCB and overload relay — one device for DOL/RVAT feeders instead of MCB + separate thermal relay.',
    seeAlso: ['mcb', 'mccb', 'olr'],
  },
  {
    id: 'acb',
    term: 'ACB (air circuit breaker)',
    category: 'Protection',
    definition:
      'Withdrawable or fixed main incomer breaker for LV switchboards (hundreds to thousands of amps). ElectroSim models thermal integral, definite-time zones, and optional BMS motor/shunt/UVR interlocks.',
    seeAlso: ['mccb'],
  },
  {
    id: 'olr',
    term: 'Overload relay (thermal / electronic)',
    category: 'Motor control',
    definition:
      'Trips on sustained motor overcurrent without clearing bolted faults alone — paired with upstream short-circuit protection (MCB, MCCB, or MPCB). NC 95–96 opens the contactor coil circuit when tripped.',
    seeAlso: ['mpcb', 'contactor'],
  },
  {
    id: 'contactor',
    term: 'Contactor',
    category: 'Motor control',
    definition:
      'Power-switching device operated by a coil (A1/A2). Main poles carry load current; auxiliaries 13–14 (NO) and 21–22 (NC) support seal-in and interlocks. Not a protective device — always coordinate with upstream protection.',
    seeAlso: ['olr', 'iec-tagging'],
  },
  {
    id: 'rcd',
    term: 'RCD / RCCB',
    category: 'Earthing & safety',
    definition:
      'Residual-current device: trips when line and neutral (or phase) currents diverge beyond sensitivity (e.g. 30 mA). Provides shock protection; does not replace overcurrent protection unless combined in an RCBO.',
    seeAlso: ['rcbo'],
  },
  {
    id: 'rcbo',
    term: 'RCBO',
    category: 'Earthing & safety',
    definition:
      'Combined overcurrent and residual-current protection in one footprint — MCB plus RCD function. Common on final circuits where both overload and 30 mA protection are required.',
    seeAlso: ['mcb', 'rcd'],
  },
  {
    id: 'iec-symbols',
    term: 'IEC symbol style',
    category: 'Symbol standards',
    definition:
      'ElectroSim defaults to IEC-oriented single-line symbols: device function letters (Q breaker, F fuse, KM contactor, M motor), coil terminals A1/A2, and odd/even pole numbering on multi-pole devices. Wire colours follow IEC conductor identification where inferred.',
    seeAlso: ['ansi-symbols', 'iec-tagging'],
  },
  {
    id: 'ansi-symbols',
    term: 'ANSI / IEEE symbol style',
    category: 'Symbol standards',
    definition:
      'North American one-line practice often uses rectangular breaker blocks, different fuse symbols, and alternate contact numbering. This app renders IEC-style glyphs; export tags and schedules remain valid — annotate drawings if a project must state “IEC 60617” vs “ANSI Y32”.',
    seeAlso: ['iec-symbols'],
  },
  {
    id: 'iec-tagging',
    term: 'IEC device tagging (Q, F, KM, M)',
    category: 'Symbol standards',
    definition:
      'Common designators: Q = switching/protection (MCB/MCCB), F = overload or fuse, KM = contactor, M = motor, H = indicator, SB = push-button, KT = timer. Numeric suffixes (Q1, KM2) distinguish duplicates on the legend sheet.',
    seeAlso: ['iec-symbols'],
  },
  {
    id: 'pe',
    term: 'PE (protective earth)',
    category: 'Earthing & safety',
    definition:
      'Safety conductor tying exposed conductive parts to earth. Green/yellow when coloured; earth bars common multiple PE returns. Must not be switched except where regulation explicitly permits (e.g. certain 4P devices).',
    seeAlso: ['tn-systems'],
  },
  {
    id: 'tn-systems',
    term: 'TN-S / TN-C-S / TT',
    category: 'Earthing & safety',
    definition:
      'TN-S: separate N and PE throughout. TN-C-S: combined PEN upstream, split N+PE on premises. TT: local earth electrode with RCD emphasis. Neutral switching (4P MCB/MCCB) matters for maintenance isolation on some schemes.',
    seeAlso: ['pe', 'rcd'],
  },
  {
    id: 'busbar',
    term: 'Busbar / busbar system',
    category: 'Distribution',
    definition:
      'Low-impedance conductor tying multiple feeders. Symbol terminals are commoned in simulation — use for incomer aggregation, tap-offs, or simplified switchboard buswork without drawing every copper run.',
    seeAlso: ['acb'],
  },
];

const byId = new Map(ELECTRICAL_GLOSSARY.map((e) => [e.id, e]));

export function getGlossaryEntry(id: string): GlossaryEntry | undefined {
  return byId.get(id);
}

export function searchGlossary(query: string): GlossaryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return ELECTRICAL_GLOSSARY;
  return ELECTRICAL_GLOSSARY.filter(
    (e) =>
      e.term.toLowerCase().includes(q) ||
      e.definition.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
  );
}

export function glossaryByCategory(
  category: GlossaryCategory
): GlossaryEntry[] {
  return ELECTRICAL_GLOSSARY.filter((e) => e.category === category);
}

/** Featured protection-device comparison block (MCB vs MCCB vs MPCB). */
export const PROTECTION_COMPARE_IDS = ['mcb', 'mccb', 'mpcb'] as const;
