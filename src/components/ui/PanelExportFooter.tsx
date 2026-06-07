import React from 'react';
import { cn } from './cn';

type Props = {
  children: React.ReactNode;
  className?: string;
};

const PanelExportFooter: React.FC<Props> = ({ children, className }) => (
  <div
    className={cn('es-panel-export-footer', className)}
    data-testid="panel-export-footer"
  >
    {children}
  </div>
);

export default PanelExportFooter;
