/**
 * Grade a user's fault diagnosis against the simulation engine explanation.
 */

export type QuizGradeResult = {
  correct: boolean;
  score: number;
  feedback: string;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(text: string): string[] {
  const stop = new Set([
    'the',
    'and',
    'for',
    'with',
    'from',
    'that',
    'this',
    'has',
    'have',
    'not',
    'are',
    'was',
    'its',
  ]);
  return normalize(text)
    .split(' ')
    .filter((t) => t.length > 2 && !stop.has(t));
}

/** First sentence — short enough for multiple-choice labels. */
export function summarizeDiagnosis(explanation: string): string {
  const trimmed = explanation.trim();
  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  const first = match?.[0]?.trim() ?? trimmed;
  if (first.length <= 140) return first.endsWith('.') ? first : `${first}.`;
  return `${first.slice(0, 137).trim()}…`;
}

export function gradeDiagnosis(
  userAnswer: string,
  engineExplanation: string | null,
  acceptedKeywords: string[] = []
): QuizGradeResult {
  const answer = userAnswer.trim();
  if (!answer) {
    return {
      correct: false,
      score: 0,
      feedback: 'Enter a diagnosis before submitting.',
    };
  }
  if (!engineExplanation) {
    return {
      correct: false,
      score: 0,
      feedback: 'Could not derive an engine reference for this scenario.',
    };
  }

  const normUser = normalize(answer);
  const normEngine = normalize(engineExplanation);
  const normAccepted = acceptedKeywords.map(normalize).filter(Boolean);

  if (normUser === normEngine) {
    return { correct: true, score: 100, feedback: 'Correct — matches the engine trace.' };
  }

  if (normEngine.includes(normUser) && normUser.length >= 12) {
    return { correct: true, score: 95, feedback: 'Correct — your answer matches the engine diagnosis.' };
  }

  for (const phrase of normAccepted) {
    if (phrase.length >= 8 && normUser.includes(phrase)) {
      return {
        correct: true,
        score: 90,
        feedback: 'Correct — you identified the root cause.',
      };
    }
  }

  const engineTokens = new Set(significantTokens(engineExplanation));
  const userTokens = significantTokens(answer);
  const overlap = userTokens.filter((t) => engineTokens.has(t));
  const overlapRatio =
    engineTokens.size > 0 ? overlap.length / engineTokens.size : 0;

  if (overlap.length >= 3 && overlapRatio >= 0.35) {
    return {
      correct: true,
      score: Math.round(70 + overlapRatio * 30),
      feedback: 'Correct — key terms match the engine trace.',
    };
  }

  return {
    correct: false,
    score: Math.round(overlapRatio * 50),
    feedback: `Not quite. Engine trace: ${engineExplanation}`,
  };
}

export function shuffleOptions<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j]!;
    out[j] = tmp!;
  }
  return out;
}
