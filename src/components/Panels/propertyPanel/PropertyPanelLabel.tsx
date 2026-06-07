import React from 'react';

/** Shared label row for property editors (moved out of PropertyPanel for modularity). */
export const Label: React.FC<{
  text: string;
  children: React.ReactNode;
}> = ({ text, children }) => (
  <div className="es-form-field">
    <label className="es-typo-label uppercase text-es-label">{text}</label>
    <div>{children}</div>
  </div>
);
