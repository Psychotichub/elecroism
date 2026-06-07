import { describe, expect, it } from 'vitest';
import {
  buildAtsTransferTimeline,
  getAtsPhaseAtTime,
  resolveAtsConfig,
  validateAtsInstallation,
} from '../atsTransferSequence';
import { atsTransfer } from '../../examples/exampleCircuits';

describe('resolveAtsConfig', () => {
  it('detects ATS topology from the example circuit', () => {
    const circuit = atsTransfer();
    const config = resolveAtsConfig(circuit);
    expect(config).not.toBeNull();
    expect(config!.utilityContactorId).toBeTruthy();
    expect(config!.genContactorId).toBeTruthy();
  });
});

describe('getAtsPhaseAtTime', () => {
  it('steps through utility fail and gen feed in open transition', () => {
    const circuit = atsTransfer();
    const config = resolveAtsConfig(circuit)!;
    const t0 = getAtsPhaseAtTime(config, 0);
    expect(t0.kind).toBe('normal_utility');
    expect(t0.utilityKmClosed).toBe(true);
    expect(t0.genKmClosed).toBe(false);

    const lost = getAtsPhaseAtTime(config, config.utilityFailAtMs + 100);
    expect(lost.utilitySourceOn).toBe(false);

    const feed = getAtsPhaseAtTime(
      config,
      config.utilityFailAtMs +
        config.genStartDelayMs +
        config.transferDelayMs +
        config.openTransitionGapMs +
        200
    );
    expect(feed.kind).toBe('gen_feed');
    expect(feed.genKmClosed).toBe(true);
    expect(feed.utilityKmClosed).toBe(false);
  });
});

describe('buildAtsTransferTimeline', () => {
  it('de-energizes load during open break then restores on gen', () => {
    const circuit = atsTransfer();
    const motor = circuit.components.find((c) => c.label === 'M1 - Load');
    expect(motor).toBeTruthy();

    const samples = buildAtsTransferTimeline(circuit, { stepMs: 200 });
    expect(samples.length).toBeGreaterThan(10);

    const early = samples.find((s) => s.atsPhase === 'normal_utility');
    const breakPhase = samples.find((s) => s.atsPhase === 'open_break');
    const genFeed = samples.find((s) => s.atsPhase === 'gen_feed');

    expect(early?.nodes[motor!.id].energized).toBe(true);
    expect(breakPhase?.nodes[motor!.id].energized).toBe(false);
    expect(genFeed?.nodes[motor!.id].energized).toBe(true);
  });
});

describe('validateAtsInstallation', () => {
  it('passes for the example ATS panel', () => {
    const circuit = atsTransfer();
    const issues = validateAtsInstallation(circuit);
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });
});
