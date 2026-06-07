import React from 'react';
import {
  difficultyLabel,
  formatEstimatedMinutes,
  type CatalogMetadata,
} from '../../utils/catalogMetadata';
import Chip from '../ui/Chip';
import { cn } from '../ui/cn';

type Props = {
  meta: CatalogMetadata;
  className?: string;
};

const difficultyClass: Record<CatalogMetadata['difficulty'], string> = {
  beginner: 'border-es-success/30 bg-es-success/15 text-es-success font-semibold uppercase tracking-wide',
  intermediate:
    'border-es-warning/30 bg-es-warning/15 text-es-warning font-semibold uppercase tracking-wide',
  advanced:
    'border-es-error/30 bg-es-error/15 text-es-error font-semibold uppercase tracking-wide',
};

const CatalogMetaChips: React.FC<Props> = ({ meta, className = '' }) => (
  <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
    <Chip as="span" className={difficultyClass[meta.difficulty]}>
      {difficultyLabel(meta.difficulty)}
    </Chip>
    <Chip as="span">{formatEstimatedMinutes(meta.estimatedMinutes)}</Chip>
    {meta.prerequisites.length > 0 ? (
      <span className="es-typo-caption leading-snug text-es-secondary">
        Prereq: {meta.prerequisites.join(', ')}
      </span>
    ) : null}
  </div>
);

export default CatalogMetaChips;
