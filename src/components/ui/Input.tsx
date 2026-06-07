import React from 'react';
import { cn } from './cn';

type Props = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, Props>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-es-sm border border-es-inputBorder bg-es-inputBg px-2 py-1.5 text-es-body-sm text-es-primary es-focus-ring',
        className
      )}
      {...rest}
    />
  )
);

Input.displayName = 'Input';

export default Input;
