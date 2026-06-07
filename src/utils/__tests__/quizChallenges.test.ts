import { describe, expect, it } from 'vitest';
import { CircuitEngine } from '../../simulation/engine';
import { explainWhyDeenergized } from '../whyIsOff';
import { getQuizChallenge, listQuizChallenges } from '../quizChallenges';
import {
  buildChallengeQuiz,
  gradeChallengeAnswer,
} from '../quizChallengeRuntime';
import { gradeDiagnosis } from '../quizGrading';

describe('quiz challenges', () => {
  const engine = new CircuitEngine();

  it('lists five challenges with catalog metadata', () => {
    const challenges = listQuizChallenges();
    const ids = challenges.map((c) => c.id);
    expect(ids).toEqual([
      'dol-mcb-off',
      'dol-coil-unwired',
      'lighting-switch-off',
      'lighting-mcb-tripped',
      'lighting-neutral-fault',
    ]);
    for (const c of challenges) {
      expect(c.difficulty).toBeTruthy();
      expect(c.estimatedMinutes).toBeGreaterThan(0);
      expect(Array.isArray(c.prerequisites)).toBe(true);
    }
  });

  it('each challenge yields a de-energized target and engine explanation', () => {
    for (const meta of listQuizChallenges()) {
      const circuit = meta.build();
      const result = engine.simulate(circuit);
      const quiz = buildChallengeQuiz(meta, circuit, result);
      expect(quiz.target).not.toBeNull();
      expect(quiz.engineExplanation).toBeTruthy();
      const node = result.nodes[quiz.target!.id];
      expect(node?.energized).toBe(false);
    }
  });

  it('grades correct DOL MCB-off diagnosis', () => {
    const challenge = getQuizChallenge('dol-mcb-off')!;
    const circuit = challenge.build();
    const result = engine.simulate(circuit);
    const motor = circuit.components.find((c) => c.label === 'M1')!;
    const explanation = explainWhyDeenergized(circuit, motor.id, result);
    const grade = gradeChallengeAnswer(
      challenge,
      'Q1 is OFF — circuit open upstream.',
      explanation
    );
    expect(grade.correct).toBe(true);
  });

  it('rejects unrelated distractor answers', () => {
    const challenge = getQuizChallenge('dol-mcb-off')!;
    const circuit = challenge.build();
    const result = engine.simulate(circuit);
    const motor = circuit.components.find((c) => c.label === 'M1')!;
    const explanation = explainWhyDeenergized(circuit, motor.id, result);
    const grade = gradeDiagnosis(
      challenge.distractors[0]!,
      explanation,
      challenge.acceptedKeywords
    );
    expect(grade.correct).toBe(false);
  });

  it('grades lighting switch-off by keyword', () => {
    const challenge = getQuizChallenge('lighting-switch-off')!;
    const circuit = challenge.build();
    const result = engine.simulate(circuit);
    const lamp = circuit.components.find((c) => c.label === 'L1')!;
    const explanation = explainWhyDeenergized(circuit, lamp.id, result);
    const grade = gradeChallengeAnswer(challenge, 'S1 is switched OFF', explanation);
    expect(grade.correct).toBe(true);
  });

  it('grades lighting neutral-fault by keyword', () => {
    const challenge = getQuizChallenge('lighting-neutral-fault')!;
    const circuit = challenge.build();
    const result = engine.simulate(circuit);
    const lamp = circuit.components.find((c) => c.label === 'L1')!;
    const explanation = explainWhyDeenergized(circuit, lamp.id, result);
    const grade = gradeChallengeAnswer(
      challenge,
      'Open neutral — no return path for L1',
      explanation
    );
    expect(grade.correct).toBe(true);
  });
});
