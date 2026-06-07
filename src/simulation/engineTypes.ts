/**
 * Shared types and utility helpers used across simulation sub-modules.
 *
 * Extracted from the monolithic `engine.ts` so that `threePhaseCalc`,
 * `faultDetection`, `terminalGraph`, and `potentials` can import a single
 * lightweight dependency instead of circular-importing the full engine.
 */

import type { CircuitComponent } from '../types';

/* ------------------------------------------------------------------ */
/*  Core types                                                        */
/* ------------------------------------------------------------------ */

export interface PotentialSets {
  live: Set<string>;
  neutral: Set<string>;
  pe: Set<string>;
  /** Terminals fed from three-phase source L1 (TN-C-S / 400 V wye) */
  liveL1: Set<string>;
  liveL2: Set<string>;
  liveL3: Set<string>;
}

/* ------------------------------------------------------------------ */
/*  Terminal key helpers                                               */
/* ------------------------------------------------------------------ */

export function terminalKey(componentId: string, pointId: string): string {
  return `${componentId}:${pointId}`;
}

export function splitTerminalKey(key: string): {
  componentId: string;
  pointId: string;
} | null {
  const sep = key.lastIndexOf(':');
  if (sep <= 0 || sep >= key.length - 1) return null;
  return {
    componentId: key.slice(0, sep),
    pointId: key.slice(sep + 1),
  };
}

export function tokenizeLabel(label: string): string[] {
  return label
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  Potential helpers                                                  */
/* ------------------------------------------------------------------ */

export function linePotentialAt(potentials: PotentialSets, key: string): boolean {
  return (
    potentials.live.has(key) ||
    potentials.liveL1.has(key) ||
    potentials.liveL2.has(key) ||
    potentials.liveL3.has(key)
  );
}

export function keyPotentialTag(
  potentials: PotentialSets,
  key: string
): 'N' | 'L' | 'L1' | 'L2' | 'L3' | 'NONE' {
  if (potentials.liveL1.has(key)) return 'L1';
  if (potentials.liveL2.has(key)) return 'L2';
  if (potentials.liveL3.has(key)) return 'L3';
  if (potentials.live.has(key)) return 'L';
  if (potentials.neutral.has(key)) return 'N';
  return 'NONE';
}

/* ------------------------------------------------------------------ */
/*  Graph helpers                                                     */
/* ------------------------------------------------------------------ */

export type TerminalGraph = Map<string, Set<string>>;

export function cloneTerminalGraph(graph: TerminalGraph): TerminalGraph {
  const out = new Map<string, Set<string>>();
  for (const [key, neighbors] of graph) {
    out.set(key, new Set(neighbors));
  }
  return out;
}

export function addEdge(graph: Map<string, Set<string>>, a: string, b: string): void {
  if (!graph.has(a)) graph.set(a, new Set());
  if (!graph.has(b)) graph.set(b, new Set());
  graph.get(a)?.add(b);
  graph.get(b)?.add(a);
}

export function connectAll(graph: Map<string, Set<string>>, keys: string[]): void {
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      addEdge(graph, keys[i], keys[j]);
    }
  }
}

export function bfsFrom(
  graph: Map<string, Set<string>>,
  starts: string[]
): Set<string> {
  const visited = new Set<string>();
  const queue = starts.filter((k) => graph.has(k));
  while (queue.length > 0) {
    const key = queue.shift();
    if (!key || visited.has(key)) continue;
    visited.add(key);
    for (const next of graph.get(key) || []) {
      if (!visited.has(next)) queue.push(next);
    }
  }
  return visited;
}

export function findTerminalByLabel(
  component: CircuitComponent,
  expectedLabel: string
): string | null {
  const u = expectedLabel.toUpperCase();
  const found = component.connectionPoints.find(
    (cp) => cp.label.toUpperCase() === u
  );
  if (!found) return null;
  return terminalKey(component.id, found.id);
}

export function bridgeLabelPairs(
  graph: Map<string, Set<string>>,
  component: CircuitComponent,
  pairs: readonly [string, string][]
): void {
  for (const [a, b] of pairs) {
    const ak = findTerminalByLabel(component, a);
    const bk = findTerminalByLabel(component, b);
    if (ak && bk) addEdge(graph, ak, bk);
  }
}

/**
 * IEC contactor auxiliary contacts:
 *  - 13-14 NO: closed when the coil is energised (contactor "picked up")
 *  - 21-22 NC: closed when the coil is de-energised
 */
export function bridgeAuxContacts(
  graph: Map<string, Set<string>>,
  component: CircuitComponent,
  pickedUp: boolean
): void {
  if (pickedUp) {
    const k13 = findTerminalByLabel(component, '13');
    const k14 = findTerminalByLabel(component, '14');
    if (k13 && k14) addEdge(graph, k13, k14);
  } else {
    const k21 = findTerminalByLabel(component, '21');
    const k22 = findTerminalByLabel(component, '22');
    if (k21 && k22) addEdge(graph, k21, k22);
  }
}
