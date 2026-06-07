import React from 'react';
import {
  LOGOMARK_BG_HEX,
  LOGOMARK_BOLT_HEX,
  LOGOMARK_BOLT_PATH,
  LOGOMARK_CORNER_RADIUS,
  LOGOMARK_VIEWBOX,
} from '../../design/logomarkPaths';
import { cn } from '../ui/cn';

type Props = {
  size?: number;
  className?: string;
  /** Accessible name; omit when decorative (`aria-hidden`). */
  title?: string;
  'aria-hidden'?: boolean;
};

const Logomark: React.FC<Props> = ({
  size = 16,
  className,
  title = 'ElectroSim',
  'aria-hidden': ariaHidden,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${LOGOMARK_VIEWBOX} ${LOGOMARK_VIEWBOX}`}
    width={size}
    height={size}
    role={ariaHidden ? undefined : 'img'}
    aria-hidden={ariaHidden || undefined}
    aria-label={ariaHidden ? undefined : title}
    className={cn('shrink-0', className)}
  >
    <rect
      width={LOGOMARK_VIEWBOX}
      height={LOGOMARK_VIEWBOX}
      rx={LOGOMARK_CORNER_RADIUS}
      fill={LOGOMARK_BG_HEX}
    />
    <path fill={LOGOMARK_BOLT_HEX} d={LOGOMARK_BOLT_PATH} />
  </svg>
);

export default Logomark;
