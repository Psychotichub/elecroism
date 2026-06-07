import React from 'react';
import { MOTION_CLASS } from '../../design/motion';
import { cn } from './cn';

type Variant = 'default' | 'success' | 'warning' | 'error' | 'learning';

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  /** Play a one-shot scale bump (e.g. when a validation count changes). */
  bump?: boolean;
};

const variantClass: Record<Variant, string> = {
  default: 'bg-es-accentMuted text-es-bright border-es-borderSubtle',
  success: 'bg-es-success/15 text-es-success border-es-success/30',
  warning: 'bg-es-warning/15 text-es-warning border-es-warning/30',
  error: 'bg-es-error/15 text-es-error border-es-error/30',
  learning: 'bg-es-learning/15 text-es-learning border-es-learning/30',
};

const Badge: React.FC<Props> = ({
  children,
  variant = 'default',
  className,
  bump,
}) => (
  <span
    className={cn(
      'inline-flex min-w-[1rem] items-center justify-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-none',
      variantClass[variant],
      bump && MOTION_CLASS.badgeBump,
      className
    )}
  >
    {children}
  </span>
);

export default Badge;
