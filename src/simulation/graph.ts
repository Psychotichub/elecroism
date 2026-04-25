import type { Circuit } from '../types';

export function buildAdjacencyList(
  circuit: Circuit
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  circuit.components.forEach((c) => adj.set(c.id, new Set()));

  circuit.wires.forEach((w) => {
    adj.get(w.fromComponentId)?.add(w.toComponentId);
    adj.get(w.toComponentId)?.add(w.fromComponentId);
  });

  return adj;
}

export function findConnectedComponents(
  startId: string,
  adj: Map<string, Set<string>>
): Set<string> {
  const visited = new Set<string>();
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    adj.get(id)?.forEach((n) => {
      if (!visited.has(n)) queue.push(n);
    });
  }
  return visited;
}
