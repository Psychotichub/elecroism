/**
 * Internal-through terminal pairs for simulation graph bridging.
 * Each row is [lineSide, loadSide]. Legacy IN/OUT / IN_L1 names are kept so
 * older circuits still simulate after new numbered labels were introduced.
 */

export const BRIDGE_PAIRS_1P: [string, string][] = [
  ['1', '2'],
  ['IN', 'OUT'],
];

/** 2P line + neutral (MCB, RCD, …): odd = in, even = out per pole. */
export const BRIDGE_PAIRS_2P_LN: [string, string][] = [
  ['1', '2'],
  ['3', '4'],
  ['IN_L', 'OUT_L'],
  ['IN_N', 'OUT_N'],
];

/** 3P line only (no N pole on device). */
export const BRIDGE_PAIRS_3P_LLL: [string, string][] = [
  ['1', '2'],
  ['3', '4'],
  ['5', '6'],
  ['IN_L1', 'OUT_L1'],
  ['IN_L2', 'OUT_L2'],
  ['IN_L3', 'OUT_L3'],
];

/** 4P L1–L3 + N. */
export const BRIDGE_PAIRS_4P_LLLN: [string, string][] = [
  ...BRIDGE_PAIRS_3P_LLL,
  ['7', '8'],
  ['IN_N', 'OUT_N'],
];

/** 3P contactor main poles (T1–T6) + legacy IN_L*. */
export const BRIDGE_PAIRS_T_POWER_3P: [string, string][] = [
  ['T1', 'T2'],
  ['T3', 'T4'],
  ['T5', 'T6'],
  ['IN_L1', 'OUT_L1'],
  ['IN_L2', 'OUT_L2'],
  ['IN_L3', 'OUT_L3'],
];

/** 4P contactor + N path. */
export const BRIDGE_PAIRS_T_POWER_4P: [string, string][] = [
  ...BRIDGE_PAIRS_T_POWER_3P,
  ['T7', 'T8'],
  ['IN_N', 'OUT_N'],
];

/** 1P contactor / relay main contact. */
export const BRIDGE_PAIRS_SINGLE_CONT: [string, string][] = [
  ['T1', 'T2'],
  ['IN', 'OUT'],
];
