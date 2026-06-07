import React, { useMemo, useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import {
  ELECTRICAL_GLOSSARY,
  getGlossaryEntry,
  GLOSSARY_CATEGORIES,
  PROTECTION_COMPARE_IDS,
  searchGlossary,
} from '../../utils/electricalGlossary';
import {
  buildSymbolLegend,
  downloadSymbolLegendCsv,
  symbolLegendToText,
} from '../../utils/symbolLegend';
import {
  AppIcon,
  Button,
  Chip,
  Input,
  PanelDataTable,
  PanelExportFooter,
  Tabs,
} from '../ui';

type SubTab = 'glossary' | 'legend';

const GlossaryLegendPanel: React.FC = () => {
  const circuit = useCircuitStore((s) => s.circuit);
  const [subTab, setSubTab] = useState<SubTab>('glossary');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [copyStatus, setCopyStatus] = useState('');

  const filteredGlossary = useMemo(() => {
    let entries = searchGlossary(query);
    if (category !== 'all') {
      entries = entries.filter((e) => e.category === category);
    }
    return entries;
  }, [query, category]);

  const legendRows = useMemo(() => buildSymbolLegend(circuit), [circuit]);

  const compareEntries = PROTECTION_COMPARE_IDS.map((id) =>
    getGlossaryEntry(id)
  ).filter(Boolean);

  const handleCopyLegend = async () => {
    const text = symbolLegendToText(legendRows, circuit.name);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Copied to clipboard');
      window.setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus('Copy failed');
    }
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-es-chrome2 text-es-primary"
      data-testid="glossary-legend-panel"
    >
      <div className="shrink-0 border-b border-es-borderSubtle px-3 py-2">
        <h2 className="es-typo-title-sm text-es-bright">
          Glossary &amp; symbol legend
        </h2>
        <p className="mt-1 es-typo-caption text-es-secondary">
          Device definitions (IEC-oriented) and an auto-generated legend for this
          sheet.
        </p>
      </div>

      <Tabs
        items={[
          { id: 'glossary', label: 'Glossary' },
          {
            id: 'legend',
            label: 'Legend',
            badge: legendRows.length > 0 ? legendRows.length : undefined,
          },
        ]}
        value={subTab}
        onChange={setSubTab}
        ariaLabel="Glossary and legend"
        className="shrink-0 border-b border-es-borderSubtle"
      />

      {subTab === 'glossary' ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2">
          <div className="mb-3 rounded-es-md border border-es-borderSubtle p-2">
            <p className="es-typo-label uppercase text-es-secondary">
              MCB vs MCCB vs MPCB
            </p>
            <ul className="mt-1.5 space-y-2">
              {compareEntries.map((e) =>
                e ? (
                  <li key={e.id} className="es-typo-caption leading-snug">
                    <span className="font-semibold text-es-bright">
                      {e.term.split('(')[0]?.trim()}
                    </span>
                    <span className="text-es-secondary"> — {e.definition}</span>
                  </li>
                ) : null
              )}
            </ul>
          </div>

          <div className="mb-2 rounded-es-md border border-es-borderSubtle p-2">
            <p className="es-typo-label uppercase text-es-secondary">
              IEC vs ANSI
            </p>
            <p className="mt-1 es-typo-caption leading-snug text-es-primary">
              {getGlossaryEntry('iec-symbols')?.definition}
            </p>
            <p className="mt-1.5 es-typo-caption leading-snug text-es-secondary">
              {getGlossaryEntry('ansi-symbols')?.definition}
            </p>
          </div>

          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search glossary…"
            aria-label="Search glossary"
            className="mb-2 es-typo-body-sm"
          />

          <div
            className="mb-2 flex flex-wrap gap-1"
            role="group"
            aria-label="Glossary categories"
            data-testid="glossary-category-chips"
          >
            <Chip active={category === 'all'} onClick={() => setCategory('all')}>
              All
            </Chip>
            {GLOSSARY_CATEGORIES.map((c) => (
              <Chip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </Chip>
            ))}
          </div>

          <ul className="space-y-2 pb-2">
            {filteredGlossary.map((e) => (
              <li
                key={e.id}
                className="rounded-es-md border border-es-borderSubtle px-2 py-1.5"
              >
                <p className="es-typo-body-sm font-semibold text-es-bright">
                  {e.term}
                </p>
                <p className="es-typo-caption uppercase text-es-secondary">
                  {e.category}
                </p>
                <p className="mt-1 es-typo-caption leading-snug text-es-primary">
                  {e.definition}
                </p>
                {e.seeAlso?.length ? (
                  <p className="mt-1 es-typo-caption text-es-secondary">
                    See also:{' '}
                    {e.seeAlso
                      .map((id) => getGlossaryEntry(id)?.term.split('(')[0]?.trim())
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                ) : null}
              </li>
            ))}
            {filteredGlossary.length === 0 ? (
              <li className="es-typo-caption text-es-secondary">
                No glossary entries match your search.
              </li>
            ) : null}
          </ul>
          <p className="pb-2 es-typo-caption text-es-secondary">
            {ELECTRICAL_GLOSSARY.length} terms · protection, standards, motor
            control
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {legendRows.length === 0 ? (
              <p className="es-typo-caption text-es-secondary">
                Place symbols on the canvas to build a legend for this sheet.
              </p>
            ) : (
              <PanelDataTable minWidth={280}>
                <thead className="es-table-sticky-head">
                  <tr>
                    <th className="es-table-num w-8">#</th>
                    <th>Symbol</th>
                    <th className="es-table-num w-10">Qty</th>
                    <th>Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {legendRows.map((r) => (
                    <tr key={r.type}>
                      <td className="es-table-num align-top font-medium">
                        {r.ref}
                      </td>
                      <td className="align-top">
                        <span className="font-semibold text-es-bright">
                          {r.displayName}
                        </span>
                        <p className="mt-0.5 es-typo-caption leading-snug text-es-secondary">
                          {r.description}
                        </p>
                      </td>
                      <td className="es-table-num align-top">{r.quantity}</td>
                      <td
                        className="align-top es-typo-caption text-es-secondary"
                        title={r.tags}
                      >
                        {r.tags || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PanelDataTable>
            )}
          </div>

          <PanelExportFooter>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={legendRows.length === 0}
              onClick={() =>
                downloadSymbolLegendCsv(circuit, circuit.name || 'drawing')
              }
            >
              <AppIcon id="download" size="inline" />
              Export CSV
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={legendRows.length === 0}
              onClick={() => void handleCopyLegend()}
            >
              <AppIcon id="copy" size="inline" />
              Copy text
            </Button>
            {copyStatus ? (
              <p className="es-typo-caption text-es-secondary">{copyStatus}</p>
            ) : null}
          </PanelExportFooter>
        </div>
      )}
    </div>
  );
};

export default GlossaryLegendPanel;
