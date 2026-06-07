import { describe, expect, it } from 'vitest';
import { CircuitEngine } from '../engine';
import { makeCircuit, makeComponent, wire } from './testHelpers';

describe('smart relay engine integration', () => {
  function smartRelayCircuit(program: string) {
    const src = makeComponent('power_source', { state: 'on' });
    const sw = makeComponent('switch', { state: 'on' });
    const sr = makeComponent('smart_relay', {
      props: { smartRelayProgram: program },
    });
    const lamp = makeComponent('lamp', { state: 'on' });
    const circuit = makeCircuit(
      [src, sw, sr, lamp],
      [
        wire(src, 'L_OUT', sr, 'A1'),
        wire(src, 'N_OUT', sr, 'A2'),
        wire(src, 'L_OUT', sw, '1'),
        wire(sw, '2', sr, 'IN1'),
        wire(src, 'L_OUT', sr, 'T1'),
        wire(sr, 'T2', lamp, 'T1'),
        wire(lamp, 'T2', src, 'N_OUT'),
      ]
    );
    return { circuit, sr, lamp };
  }

  it('closes T1↔T2 when IN1 is active and program is OUT1 = IN1', () => {
    const { circuit, sr, lamp } = smartRelayCircuit('OUT1 = IN1');
    const engine = new CircuitEngine();
    const result = engine.simulate(circuit);
    expect(sr.state).toBe('on');
    expect(result.nodes[lamp.id]?.energized).toBe(true);
  });

  it('keeps output open when IN2 blocks AND NOT logic', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const sw = makeComponent('switch', { state: 'on' });
    const sr = makeComponent('smart_relay', {
      props: { smartRelayProgram: 'OUT1 = IN1 AND NOT IN2' },
    });
    const lamp = makeComponent('lamp', { state: 'on' });
    const circuit = makeCircuit(
      [src, sw, sr, lamp],
      [
        wire(src, 'L_OUT', sr, 'A1'),
        wire(src, 'N_OUT', sr, 'A2'),
        wire(src, 'L_OUT', sw, '1'),
        wire(sw, '2', sr, 'IN1'),
        wire(src, 'L_OUT', sr, 'IN2'),
        wire(src, 'L_OUT', sr, 'T1'),
        wire(sr, 'T2', lamp, 'T1'),
        wire(lamp, 'T2', src, 'N_OUT'),
      ]
    );
    const engine = new CircuitEngine();
    engine.simulate(circuit);
    expect(sr.state).toBe('off');
  });
});

describe('timer ON-delay integration', () => {
  it('holds NC path until delay elapses with stepped simulation', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const timer = makeComponent('timer', {
      props: { timerDelayMs: 1000 },
    });
    const lamp = makeComponent('lamp', { state: 'on' });
    const circuit = makeCircuit(
      [src, timer, lamp],
      [
        wire(src, 'L_OUT', timer, 'A1'),
        wire(src, 'N_OUT', timer, 'A2'),
        wire(src, 'L_OUT', timer, 'COM'),
        wire(timer, 'NO', lamp, 'T1'),
        wire(lamp, 'T2', src, 'N_OUT'),
      ]
    );
    const engine = new CircuitEngine();
    const t0 = 1_000_000;
    engine.simulate(circuit, 0, t0, { simStepMs: 400 });
    expect(timer.state).toBe('off');

    engine.simulate(circuit, 0, t0 + 500, { simStepMs: 400 });
    expect(timer.state).toBe('off');

    engine.simulate(circuit, 0, t0 + 1100, { simStepMs: 400 });
    expect(timer.state).toBe('on');
  });

  it('resets when coil supply drops', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const sw = makeComponent('switch', { state: 'on' });
    const timer = makeComponent('timer', {
      props: { timerDelayMs: 500 },
    });
    const circuit = makeCircuit(
      [src, sw, timer],
      [
        wire(src, 'L_OUT', sw, '1'),
        wire(sw, '2', timer, 'A1'),
        wire(src, 'N_OUT', timer, 'A2'),
      ]
    );
    const engine = new CircuitEngine();
    const t0 = 2_000_000;
    for (let t = 0; t <= 600; t += 200) {
      engine.simulate(circuit, 0, t0 + t, { simStepMs: 200 });
    }
    expect(timer.state).toBe('on');

    sw.state = 'off';
    engine.simulate(circuit, 0, t0 + 700, { simStepMs: 200 });
    expect(timer.state).toBe('off');
  });
});
