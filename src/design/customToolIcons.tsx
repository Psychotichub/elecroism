import React from 'react';

/** 16×16 CAD-style selection cursor (filled). */
export const SelectToolIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden {...props}>
    <path d="M4.25 2.25v10.25l2.5-2.5h2.75l4.25-5.25-9.5 2.5z" />
  </svg>
);

/** 16×16 wire segment with endpoint nodes. */
export const WireToolIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    aria-hidden
    {...props}
  >
    <circle cx="3.75" cy="12.25" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12.25" cy="3.75" r="1.5" fill="currentColor" stroke="none" />
    <line x1="5" y1="11" x2="11" y2="5" />
  </svg>
);

/** 16×16 four-way pan / move affordance. */
export const PanToolIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...props}
  >
    <path d="M8 3v10M3 8h10" />
    <path d="M8 3L6.25 5.25M8 3l1.75 2.25M13 8l-2.25 1.75M13 8l-2.25-1.75M8 13l1.75-2.25M8 13L6.25 10.75M3 8l2.25 1.75M3 8l2.25-1.75" />
  </svg>
);
