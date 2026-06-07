import React from 'react';
import type { PluginComponentTypeDef, PluginPropertyField } from '../../../types/plugin';
import { usePPCtx } from './PropertyPanelContext';

function renderField(
  field: PluginPropertyField,
  value: unknown,
  onChange: (key: string, value: string | number | boolean) => void
) {
  const key = field.key;
  if (field.type === 'boolean') {
    return (
      <label key={key} className="mb-2 flex items-center gap-2 es-typo-body">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(key, e.target.checked)}
        />
        {field.label}
      </label>
    );
  }
  if (field.type === 'select' && field.options?.length) {
    const selectValue =
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : field.options[0];
    return (
      <div key={key} className="mb-2">
        <label className="mb-0.5 block es-typo-caption opacity-70">{field.label}</label>
        <select
          value={selectValue}
          onChange={(e) => onChange(key, e.target.value)}
          className="input-field w-full py-1 es-typo-body"
        >
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (field.type === 'number') {
    return (
      <div key={key} className="mb-2">
        <label className="mb-0.5 block es-typo-caption opacity-70">{field.label}</label>
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={typeof value === 'number' ? value : Number(value) || 0}
          onChange={(e) => onChange(key, Number(e.target.value))}
          className="input-field w-full py-1 es-typo-body"
        />
      </div>
    );
  }
  return (
    <div key={key} className="mb-2">
      <label className="mb-0.5 block es-typo-caption opacity-70">{field.label}</label>
      <input
        type="text"
        value={
          typeof value === 'string' || typeof value === 'number'
            ? String(value)
            : ''
        }
        placeholder={field.placeholder}
        onChange={(e) => onChange(key, e.target.value)}
        className="input-field w-full py-1 es-typo-body"
      />
    </div>
  );
}

type Props = {
  typeDef: PluginComponentTypeDef;
};

export const PluginComponentProps: React.FC<Props> = ({ typeDef }) => {
  const { selectedComp, updateComponent } = usePPCtx();
  if (!selectedComp) return null;

  const onChange = (key: string, value: string | number | boolean) => {
    updateComponent(selectedComp.id, {
      properties: { ...selectedComp.properties, [key]: value },
    });
  };

  return (
    <div>
      <p className="mb-2 es-typo-caption opacity-70">
        Plugin: {typeDef.label}
        {typeDef.description ? ` — ${typeDef.description}` : ''}
      </p>
      {(typeDef.propertyFields ?? []).map((field) =>
        renderField(field, selectedComp.properties[field.key as keyof typeof selectedComp.properties], onChange)
      )}
      {typeDef.toggleable ? (
        <p className="es-typo-caption opacity-60">Double-click the symbol to toggle state.</p>
      ) : null}
    </div>
  );
};
