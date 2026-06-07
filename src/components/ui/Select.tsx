import React from 'react';
import { cn } from './cn';

type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, Props>(
  ({ className, ...rest }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full cursor-pointer appearance-none rounded-es-sm border border-es-inputBorder bg-es-inputBg px-2 py-1.5 text-es-body-sm text-es-primary es-focus-ring',
        className
      )}
      {...rest}
    />
  )
);

Select.displayName = 'Select';

export default Select;
