import React from 'react';
import { MOTION_CLASS } from '../../design/motion';
import { cn } from './cn';

export type CardVariant = 'default' | 'learning';

type Props = React.HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'aside' | 'section';
  variant?: CardVariant;
};

const variantClass: Record<CardVariant, string> = {
  default: 'border-es-borderSubtle',
  learning: 'es-card-learning',
};

const Card: React.FC<Props> = ({
  as: Tag = 'div',
  variant = 'default',
  className,
  children,
  ...rest
}) => (
  <Tag
    className={cn(
      'rounded-es-lg border bg-es-raised text-es-primary shadow-[var(--es-shadow-panel)]',
      MOTION_CLASS.transitionColors,
      variantClass[variant],
      className
    )}
    {...rest}
  >
    {children}
  </Tag>
);

export default Card;
