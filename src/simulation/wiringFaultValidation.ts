import type { Circuit, FaultEvent } from '../types';

/**
 * Contactor poles are not protective devices — overload is normally cleared
 * by upstream MCB/fuse. Here we still flag unsafe current vs nameplate
 * `ratingAmps` when the contactor is picked up (main poles closed).
 */
export function validateContactorOverloadFaults(
  circuit: Circuit,
  seriesPathCurrents: Map<string, number>,
  contactorPickup: Set<string>,
  wallMs: number
): FaultEvent[] {
  const out: FaultEvent[] = [];
  for (const c of circuit.components) {
    if (
      c.type !== 'contactor' &&
      c.type !== 'three_phase_contactor' &&
      c.type !== 'four_phase_contactor'
    ) {
      continue;
    }
    if (!contactorPickup.has(c.id)) continue;

    const branch = seriesPathCurrents.get(c.id) ?? 0;
    const rating = Math.max(0.5, c.properties.ratingAmps ?? 25);
    const tag =
      c.type === 'three_phase_contactor'
        ? '3P contactor'
        : c.type === 'four_phase_contactor'
          ? '4P contactor'
          : 'Contactor';

    if (branch > rating * 10) {
      out.push({
        id: crypto.randomUUID(),
        type: 'short_circuit',
        affectedComponentId: c.id,
        message: `${tag} "${c.label}": ${branch.toFixed(0)}A through closed poles >> ${rating}A rating — prospective bolted fault or severe coordination error.`,
        severity: 'critical',
        timestamp: wallMs,
      });
    } else if (branch > rating * 1.1) {
      out.push({
        id: crypto.randomUUID(),
        type: 'overload',
        affectedComponentId: c.id,
        message: `${tag} "${c.label}": main-path current ${branch.toFixed(1)}A exceeds nameplate ${rating}A (~>110%) while poles are closed — undersized device or missing upstream protection.`,
        severity: 'critical',
        timestamp: wallMs,
      });
    }
  }
  return out;
}

export function validateEthernetWires(
  circuit: Circuit,
  wallMs: number
): FaultEvent[] {
  const cpLabel = (
    componentId: string,
    pointId: string
  ): string | null => {
    const c = circuit.components.find((x) => x.id === componentId);
    const cp = c?.connectionPoints.find((p) => p.id === pointId);
    return cp?.label ?? null;
  };
  const isEthernetTerminal = (label: string | null): boolean => {
    const u = (label ?? '').toUpperCase();
    return (
      u.includes('ETH') ||
      u.includes('RJ45') ||
      u.includes('LAN') ||
      u.includes('MODBUS_TCP') ||
      u.includes('BACNET_IP')
    );
  };

  const out: FaultEvent[] = [];
  for (const wire of circuit.wires) {
    const fromLabel = cpLabel(wire.fromComponentId, wire.fromPointId);
    const toLabel = cpLabel(wire.toComponentId, wire.toPointId);
    const fromIsEth = isEthernetTerminal(fromLabel);
    const toIsEth = isEthernetTerminal(toLabel);
    const endpointLooksEthernet = fromIsEth || toIsEth;
    const isEthernetWire =
      wire.color === 'ethernet' || wire.wireProtocol === 'ethernet';

    if (endpointLooksEthernet && !isEthernetWire) {
      out.push({
        id: crypto.randomUUID(),
        type: 'overload',
        affectedComponentId: wire.fromComponentId,
        message: `Ethernet terminal mismatch: wire "${wire.id}" should be ethernet type.`,
        severity: 'warning',
        timestamp: wallMs,
      });
    } else if (!endpointLooksEthernet && wire.color === 'ethernet') {
      out.push({
        id: crypto.randomUUID(),
        type: 'overload',
        affectedComponentId: wire.fromComponentId,
        message: `Ethernet wire "${wire.id}" connects non-ethernet terminals.`,
        severity: 'warning',
        timestamp: wallMs,
      });
    }
  }
  return out;
}
