import { describe, expect, it } from 'vitest';
import { CircuitEngine } from '../engine';
import { buildTerminalGraph } from '../terminalGraph';
import { findTerminalByLabel } from '../engineTypes';
import {
  mergeAtsSimulateOverrides,
  selectorRoutingMode,
  selectorSwitchBridgePairs,
  usesAtsBmsContactorOverride,
} from '../selectorSwitchRouting';
import { atsTransfer } from '../../examples/exampleCircuits';
import { makeCircuit, makeComponent, wire } from './testHelpers';

describe('selectorSwitchBridgePairs', () => {
  it('bridges COM to AUTO in AUTO position', () => {
    const s = makeComponent('selector_switch', {
      props: { selectorPosition: 'AUTO' },
    });
    expect(selectorSwitchBridgePairs(s)).toEqual([['COM', 'AUTO']]);
  });

  it('bridges COM to MAN in MANUAL position', () => {
    const s = makeComponent('selector_switch', {
      props: { selectorPosition: 'MANUAL' },
    });
    expect(selectorSwitchBridgePairs(s)).toEqual([['COM', 'MAN']]);
  });

  it('isolates both branches in OFF', () => {
    const s = makeComponent('selector_switch', {
      props: { selectorPosition: 'OFF' },
    });
    expect(selectorSwitchBridgePairs(s)).toEqual([]);
  });
});

describe('selectorRoutingMode', () => {
  it('reports auto_bms_override when ATS controller enabled', () => {
    const s = makeComponent('selector_switch', {
      props: { selectorPosition: 'AUTO', atsController: true },
    });
    expect(selectorRoutingMode(s)).toBe('auto_bms_override');
  });

  it('reports manual_physical in MANUAL', () => {
    const s = makeComponent('selector_switch', {
      props: { selectorPosition: 'MANUAL', atsController: true },
    });
    expect(selectorRoutingMode(s)).toBe('manual_physical');
  });
});

describe('mergeAtsSimulateOverrides', () => {
  it('applies BMS contactor overrides in AUTO', () => {
    const circuit = atsTransfer();
    const overrides = mergeAtsSimulateOverrides(circuit, 0);
    expect(overrides?.forcedContactorPickup?.size).toBe(2);
    const kmMain = circuit.components.find((c) => c.label === 'KM-M')!;
    const kmGen = circuit.components.find((c) => c.label === 'KM-G')!;
    expect(overrides?.forcedContactorPickup?.get(kmMain.id)).toBe(true);
    expect(overrides?.forcedContactorPickup?.get(kmGen.id)).toBe(false);
  });

  it('skips BMS overrides in MANUAL', () => {
    const circuit = atsTransfer();
    const selector = circuit.components.find((c) => c.label === 'S1')!;
    selector.properties.selectorPosition = 'MANUAL';
    expect(mergeAtsSimulateOverrides(circuit, 5000)).toBeUndefined();
  });

  it('turns utility source off after mains fail time', () => {
    const circuit = atsTransfer();
    const selector = circuit.components.find((c) => c.label === 'S1')!;
    const failMs = selector.properties.atsUtilityFailAtMs ?? 2000;
    mergeAtsSimulateOverrides(circuit, failMs + 500);
    expect(circuit.components.find((c) => c.label === 'Mains')?.state).toBe('off');
  });
});

describe('selector switch engine integration', () => {
  it('terminal graph connects COM to AUTO only in AUTO', () => {
    const s = makeComponent('selector_switch', {
      state: 'on',
      props: { selectorPosition: 'AUTO' },
    });
    const circuit = makeCircuit([s], []);
    const graph = buildTerminalGraph(circuit);
    const com = findTerminalByLabel(s, 'COM')!;
    const auto = findTerminalByLabel(s, 'AUTO')!;
    const man = findTerminalByLabel(s, 'MAN')!;
    expect(graph.get(com)?.has(auto)).toBe(true);
    expect(graph.get(com)?.has(man)).toBe(false);
  });

  it('ATS example energizes load at t=0 and drops during open break', () => {
    const circuit = atsTransfer();
    const motor = circuit.components.find((c) => c.label === 'M1 - Load')!;
    const engine = new CircuitEngine();

    const t0 = engine.simulate(structuredClone(circuit), 0, 0, {
      atsSequenceTimeMs: 0,
    });
    expect(t0.nodes[motor.id]?.energized).toBe(true);
    expect(usesAtsBmsContactorOverride(circuit)).toBe(true);

    const selector = circuit.components.find((c) => c.label === 'S1')!;
    const fail = selector.properties.atsUtilityFailAtMs ?? 2000;
    const start = selector.properties.atsGenStartDelayMs ?? 1500;
    const xfer = selector.properties.atsTransferDelayMs ?? 1000;
    const gap = selector.properties.atsOpenTransitionGapMs ?? 300;
    const breakMs = fail + start + xfer + gap / 2;

    const tBreak = engine.simulate(structuredClone(circuit), 0, breakMs, {
      atsSequenceTimeMs: breakMs,
    });
    expect(tBreak.nodes[motor.id]?.energized).toBe(false);
  });

  it('MANUAL position uses physical MAN path without ATS overrides', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const selector = makeComponent('selector_switch', {
      state: 'on',
      props: {
        selectorPosition: 'MANUAL',
        atsController: true,
        atsUtilityContactorLabel: 'KM-M',
        atsGenContactorLabel: 'KM-G',
      },
    });
    const km = makeComponent('contactor', {
      label: 'KM-G',
      state: 'off',
    });
    const wires = [
      wire(src, 'L_OUT', selector, 'COM'),
      wire(selector, 'MAN', km, 'A1'),
      wire(km, 'A2', src, 'N_OUT'),
    ];
    const circuit = makeCircuit([src, selector, km], wires);
    const engine = new CircuitEngine();
    const result = engine.simulate(circuit, 0, 0, { atsSequenceTimeMs: 99999 });
    expect(result.nodes[km.id]?.energized).toBe(true);
    expect(km.state).toBe('on');
  });
});
