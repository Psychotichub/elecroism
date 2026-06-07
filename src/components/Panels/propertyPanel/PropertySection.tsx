import React, { useState } from 'react';
import AppIcon from '../../ui/AppIcon';
import { cn } from '../../ui/cn';
import { MOTION_CLASS } from '../../../design/motion';

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

const PropertySection: React.FC<Props> = ({
  title,
  defaultOpen = false,
  children,
  className,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={cn('es-property-section', className)}
      data-testid={`property-section-${title.toLowerCase()}`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="es-property-section-trigger es-focus-ring"
      >
        <span
          className={cn(
            'es-icon-inline text-es-secondary',
            MOTION_CLASS.transitionAll,
            open && 'rotate-90'
          )}
        >
          <AppIcon id="chevron-right" size="inline" />
        </span>
        <span className="es-typo-label text-es-primary">{title}</span>
      </button>
      {open ? (
        <div className="es-property-section-body es-density-stack">{children}</div>
      ) : null}
    </section>
  );
};

export default PropertySection;
