import { describe, expect, it } from 'vitest';
import {
  atsTransfer,
  dolMotorStarter,
  starDeltaStarter,
} from '../../examples/exampleCircuits';
import {
  evaluateTutorialStep,
  getGuidedTutorial,
  listGuidedTutorials,
} from '../guidedTutorials';
import {
  contactorCoilWired,
  dolPowerPathWired,
  hasAtsTransferPanel,
  hasStarDeltaStarterKit,
  motorEnergized,
  motorFeederSized,
  threePhaseMotorEnergized,
} from '../tutorialCheckpoints';
import { CircuitEngine } from '../../simulation/engine';

describe('guidedTutorials', () => {
  const tutorial = getGuidedTutorial('dol-starter-1p');
  const engine = new CircuitEngine();

  it('lists four guided lessons with catalog metadata', () => {
    const tutorials = listGuidedTutorials();
    const ids = tutorials.map((t) => t.id);
    expect(ids).toEqual([
      'dol-starter-1p',
      'star-delta-3p',
      'ats-transfer-sequence',
      'cable-sizing-exercise',
    ]);
    for (const t of tutorials) {
      expect(t.difficulty).toBeTruthy();
      expect(t.estimatedMinutes).toBeGreaterThan(0);
      expect(Array.isArray(t.prerequisites)).toBe(true);
    }
    expect(tutorial?.steps.length).toBeGreaterThanOrEqual(8);
  });

  it('loads reference circuits for circuit-based lessons', () => {
    const starDelta = getGuidedTutorial('star-delta-3p')!;
    const ats = getGuidedTutorial('ats-transfer-sequence')!;
    const cable = getGuidedTutorial('cable-sizing-exercise')!;
    expect(starDelta.initialCircuit).toBeDefined();
    expect(ats.initialCircuit).toBeDefined();
    expect(cable.initialCircuit).toBeDefined();
    expect(starDelta.clearOnStart).toBe(false);
    expect(getGuidedTutorial('dol-starter-1p')!.clearOnStart).toBe(true);
  });

  it('passes wiring checkpoints on the reference DOL circuit', () => {
    const circuit = dolMotorStarter();
    const engine = new CircuitEngine();
    const simulationResult = engine.simulate(circuit);

    expect(dolPowerPathWired(circuit)).toBe(true);
    expect(contactorCoilWired(circuit)).toBe(true);
    expect(motorEnergized(circuit, simulationResult)).toBe(true);

    const ctx = { circuit, simulationResult };
    const powerIdx = tutorial!.steps.findIndex((s) => s.id === 'power-wires');
    const coilIdx = tutorial!.steps.findIndex((s) => s.id === 'coil-neutral');
    const simIdx = tutorial!.steps.findIndex((s) => s.id === 'simulate');

    expect(evaluateTutorialStep(tutorial!, powerIdx, ctx)).toBe(true);
    expect(evaluateTutorialStep(tutorial!, coilIdx, ctx)).toBe(true);
    expect(evaluateTutorialStep(tutorial!, simIdx, ctx)).toBe(true);
  });

  it('fails early checkpoints on an empty sheet', () => {
    const circuit = { ...dolMotorStarter(), components: [], wires: [] };
    const ctx = { circuit, simulationResult: null };
    const mcbIdx = tutorial!.steps.findIndex((s) => s.id === 'mcb');
    expect(evaluateTutorialStep(tutorial!, mcbIdx, ctx)).toBe(false);
  });

  it('passes star-delta kit checkpoint on the reference circuit', () => {
    const starTutorial = getGuidedTutorial('star-delta-3p')!;
    const circuit = starDeltaStarter();
    const kitIdx = starTutorial.steps.findIndex((s) => s.id === 'kit');
    expect(hasStarDeltaStarterKit(circuit)).toBe(true);
    expect(
      evaluateTutorialStep(starTutorial, kitIdx, {
        circuit,
        simulationResult: null,
      })
    ).toBe(true);
  });

  it('passes ATS panel and utility-feed checkpoints', () => {
    const atsTutorial = getGuidedTutorial('ats-transfer-sequence')!;
    const circuit = atsTransfer();
    const simulationResult = engine.simulate(circuit);
    const panelIdx = atsTutorial.steps.findIndex((s) => s.id === 'panel');
    const simIdx = atsTutorial.steps.findIndex((s) => s.id === 'simulate');
    expect(hasAtsTransferPanel(circuit)).toBe(true);
    expect(
      evaluateTutorialStep(atsTutorial, panelIdx, { circuit, simulationResult })
    ).toBe(true);
    expect(
      evaluateTutorialStep(atsTutorial, simIdx, { circuit, simulationResult })
    ).toBe(true);
    expect(threePhaseMotorEnergized(circuit, simulationResult)).toBe(true);
  });

  it('flags undersized feeders in the cable sizing exercise', () => {
    const cableTutorial = getGuidedTutorial('cable-sizing-exercise')!;
    const circuit = cableTutorial.initialCircuit!();
    const simulationResult = engine.simulate(circuit);
    const baselineIdx = cableTutorial.steps.findIndex(
      (s) => s.id === 'baseline'
    );
    const wizardIdx = cableTutorial.steps.findIndex((s) => s.id === 'wizard');
    expect(motorEnergized(circuit, simulationResult)).toBe(true);
    expect(motorFeederSized(circuit, 2.5)).toBe(false);
    expect(
      evaluateTutorialStep(cableTutorial, baselineIdx, {
        circuit,
        simulationResult,
      })
    ).toBe(true);
    expect(
      evaluateTutorialStep(cableTutorial, wizardIdx, {
        circuit,
        simulationResult,
      })
    ).toBe(false);
  });
});
