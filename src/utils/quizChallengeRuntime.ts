import type { Circuit, CircuitComponent, SimulationResult } from '../types';
import { explainWhyDeenergized } from './whyIsOff';
import {
  gradeDiagnosis,
  shuffleOptions,
  summarizeDiagnosis,
  type QuizGradeResult,
} from './quizGrading';
import type { QuizChallenge } from './quizChallenges';

export type ChallengeQuizState = {
  target: CircuitComponent | null;
  engineExplanation: string | null;
  correctAnswer: string;
  options: string[];
};

export function resolveChallengeTarget(
  circuit: Circuit,
  targetLabel: string
): CircuitComponent | null {
  return circuit.components.find((c) => c.label === targetLabel) ?? null;
}

export function buildChallengeQuiz(
  challenge: QuizChallenge,
  circuit: Circuit,
  simulationResult: SimulationResult | null
): ChallengeQuizState {
  const target = resolveChallengeTarget(circuit, challenge.targetLabel);
  const rawExplanation = target
    ? explainWhyDeenergized(circuit, target.id, simulationResult)
    : null;
  const engineExplanation = rawExplanation;
  const correctAnswer = engineExplanation
    ? summarizeDiagnosis(engineExplanation)
    : challenge.distractors[0] ?? 'Unknown fault';

  const optionSet = new Set<string>([correctAnswer]);
  for (const d of challenge.distractors) {
    if (optionSet.size >= 4) break;
    optionSet.add(d);
  }
  const options = shuffleOptions([...optionSet]).slice(0, 4);

  return {
    target,
    engineExplanation,
    correctAnswer,
    options,
  };
}

export function gradeChallengeAnswer(
  challenge: QuizChallenge,
  userAnswer: string,
  engineExplanation: string | null,
  correctSummary?: string
): QuizGradeResult {
  const primary = gradeDiagnosis(
    userAnswer,
    engineExplanation,
    challenge.acceptedKeywords
  );
  if (primary.correct) return primary;

  if (correctSummary && normalizeAnswer(userAnswer) === normalizeAnswer(correctSummary)) {
    return {
      correct: true,
      score: 100,
      feedback: 'Correct — matches the engine trace.',
    };
  }

  if (correctSummary) {
    return gradeDiagnosis(userAnswer, correctSummary, challenge.acceptedKeywords);
  }

  return primary;
}

function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
