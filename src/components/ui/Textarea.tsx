import React from 'react';
import { cn } from './cn';

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, Props>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-es-sm border border-es-inputBorder bg-es-inputBg px-2 py-1.5 text-es-body-sm text-es-primary es-focus-ring',
        className
      )}
      {...rest}
    />
  )
);

Textarea.displayName = 'Textarea';

export default Textarea;
