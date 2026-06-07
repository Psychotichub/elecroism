import { describe, expect, it } from 'vitest';
import { dolMotorStarter } from '../../examples/exampleCircuits';
import {
  evaluateTutorialStep,
  getGuidedTutorial,
  listGuidedTutorials,
} from '../guidedTutorials';
import {
  contactorCoilWired,
  dolPowerPathWired,
  motorEnergized,
} from '../tutorialCheckpoints';
import { CircuitEngine } from '../../simulation/engine';

describe('guidedTutorials', () => {
  const tutorial = getGuidedTutorial('dol-starter-1p');

  it('lists the DOL starter lesson', () => {
    expect(listGuidedTutorials().some((t) => t.id === 'dol-starter-1p')).toBe(
      true
    );
    expect(tutorial?.steps.length).toBeGreaterThanOrEqual(8);
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
});
