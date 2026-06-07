import React from 'react';
import { cn } from './cn';
import { motionClass } from '../../design/motion';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-es-accent text-es-accentFg hover:opacity-90 disabled:opacity-40',
  secondary:
    'bg-es-btnSecondary text-es-primary hover:bg-es-btnSecondaryHover disabled:opacity-40',
  ghost:
    'bg-transparent text-es-primary hover:bg-es-hover disabled:opacity-40',
  danger:
    'bg-es-error text-white hover:opacity-90 disabled:opacity-40',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-[11px] rounded-es-sm',
  md: 'px-3 py-1.5 text-xs rounded-es-md',
};

const Button = React.forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'secondary', size = 'sm', className, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1 font-semibold es-focus-ring',
        motionClass(),
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...rest}
    />
  )
);

Button.displayName = 'Button';

export default Button;
