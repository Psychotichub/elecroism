import React from 'react';
import { cn } from './cn';
import { motionClass } from '../../design/motion';

type BaseProps = {
  active?: boolean;
  className?: string;
  children?: React.ReactNode;
};

type ButtonChipProps = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    as?: 'button';
  };

type SpanChipProps = BaseProps &
  React.HTMLAttributes<HTMLSpanElement> & {
    as: 'span';
  };

type Props = ButtonChipProps | SpanChipProps;

const chipClass = (active: boolean | undefined, className?: string) =>
  cn(
    'rounded-full border px-2 py-0.5 text-[10px] font-medium',
    motionClass(),
    active
      ? 'border-es-accent bg-es-accent text-es-accentFg'
      : 'border-es-borderSubtle bg-transparent text-es-secondary',
    className
  );

function SpanChip({
  active,
  className,
  children,
  ref,
  ...spanRest
}: SpanChipProps & { ref?: React.Ref<HTMLSpanElement> }) {
  return (
    <span ref={ref} className={chipClass(active, className)} {...spanRest}>
      {children}
    </span>
  );
}

function ButtonChip({
  active,
  className,
  children,
  type = 'button',
  ref,
  ...buttonRest
}: ButtonChipProps & { ref?: React.Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(chipClass(active, className), 'es-focus-ring hover:bg-es-hover')}
      {...buttonRest}
    >
      {children}
    </button>
  );
}

const Chip = React.forwardRef<HTMLElement, Props>((props, ref) =>
  props.as === 'span' ? (
    <SpanChip {...props} ref={ref} />
  ) : (
    <ButtonChip {...props} ref={ref as React.Ref<HTMLButtonElement>} />
  )
);

Chip.displayName = 'Chip';

export default Chip;
