export type CatalogDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type CatalogMetadata = {
  difficulty: CatalogDifficulty;
  /** Approximate completion time for the lesson or challenge. */
  estimatedMinutes: number;
  /** Human-readable ids or titles of recommended prior activities. */
  prerequisites: string[];
};

export function difficultyLabel(difficulty: CatalogDifficulty): string {
  switch (difficulty) {
    case 'beginner':
      return 'Beginner';
    case 'intermediate':
      return 'Intermediate';
    default:
      return 'Advanced';
  }
}

export function formatEstimatedMinutes(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}
