import React from 'react';
import { cn } from './cn';

type Props = {
  children: React.ReactNode;
  minWidth?: number | string;
  className?: string;
  zebra?: boolean;
};

const PanelDataTable: React.FC<Props> = ({
  children,
  minWidth,
  className,
  zebra = true,
}) => (
  <div className={cn('es-panel-table-wrap', className)} data-testid="panel-data-table">
    <table
      className={cn('es-table', zebra && 'es-table-zebra')}
      style={
        minWidth != null
          ? {
              minWidth:
                typeof minWidth === 'number' ? `${minWidth}px` : minWidth,
            }
          : undefined
      }
    >
      {children}
    </table>
  </div>
);

export default PanelDataTable;
