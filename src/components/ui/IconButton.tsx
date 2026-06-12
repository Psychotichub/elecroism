import React from 'react';
import { cn } from './cn';
import { motionClass } from '../../design/motion';
import Tooltip from './Tooltip';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  size?: 'sm' | 'md';
  label: string;
  /** Tooltip text; defaults to `label`. Set `false` to disable. */
  tooltip?: string | false;
};

const IconButton = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      active,
      size = 'sm',
      label,
      tooltip,
      className,
      children,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const tooltipContent = tooltip === false ? null : (tooltip ?? label);
    const button = (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        aria-pressed={active ?? false}
        className={cn(
          'es-touch-target inline-flex items-center justify-center es-focus-ring',
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
    );

    if (!tooltipContent) return button;

    return <Tooltip content={tooltipContent}>{button}</Tooltip>;
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;
