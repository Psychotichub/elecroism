import React from 'react';
import { cn } from './cn';
import { motionClass } from '../../design/motion';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  size?: 'sm' | 'md';
  label: string;
};

const IconButton = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      active,
      size = 'sm',
      label,
      className,
      children,
      type = 'button',
      title,
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={active ?? false}
      title={title ?? label}
      className={cn(
        'inline-flex items-center justify-center es-focus-ring',
        motionClass(),
        size === 'sm' ? 'h-7 w-7 rounded-es-sm text-sm' : 'h-8 w-8 rounded-es-md text-base',
        active
          ? 'bg-es-accent text-es-accentFg'
          : 'text-es-primary hover:bg-es-hover',
        className
      )}
      {...rest}
    >
      <span className="es-icon-toolbar">{children}</span>
    </button>
  )
);

IconButton.displayName = 'IconButton';

export default IconButton;
