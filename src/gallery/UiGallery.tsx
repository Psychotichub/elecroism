import React, { useState } from 'react';
import Logomark from '../components/brand/Logomark';
import SelectionHeaderCard from '../components/Panels/propertyPanel/SelectionHeaderCard';
import { Button, Dialog, Input, SegmentedControl, Tabs } from '../components/ui';
import type { TabItem } from '../components/ui';

type GalleryTheme = 'dark' | 'light';

const MENU_LABELS = ['File', 'Edit', 'View', 'Simulate', 'Insert', 'Window', 'Help'];

const INSPECTOR_TABS: TabItem<'properties' | 'validation' | 'layers'>[] = [
  { id: 'properties', label: 'Properties' },
  { id: 'validation', label: 'Validation', badge: 2, badgeVariant: 'warning' },
  { id: 'layers', label: 'Layers' },
];

const UiGallery: React.FC = () => {
  const [theme, setTheme] = useState<GalleryTheme>('dark');
  const [inspectorTab, setInspectorTab] =
    useState<'properties' | 'validation' | 'layers'>('properties');
  const [tool, setTool] = useState<'select' | 'wire' | 'delete' | 'pan'>(
    'select'
  );

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-es-app text-es-primary"
      data-testid="ui-gallery-root"
    >
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-es-borderSubtle bg-es-chrome1 px-4 py-3">
        <div>
          <h1 className="es-typo-title-sm text-es-bright">ElectroSim UI Gallery</h1>
          <p className="es-typo-caption text-es-secondary">
            Shell chrome reference for visual regression (menu, toolbar, inspector,
            dialog).
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Gallery theme">
          <Button
            variant={theme === 'dark' ? 'primary' : 'secondary'}
            onClick={() => setTheme('dark')}
            aria-pressed={theme === 'dark'}
          >
            Dark theme
          </Button>
          <Button
            variant={theme === 'light' ? 'primary' : 'secondary'}
            onClick={() => setTheme('light')}
            aria-pressed={theme === 'light'}
          >
            Light theme
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 p-6">
        <section data-testid="gallery-menu">
          <h2 className="mb-2 es-typo-label uppercase text-es-secondary">Menu bar</h2>
          <nav className="es-menu-bar rounded-es-md border border-es-borderSubtle" role="menubar">
            {MENU_LABELS.map((label) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                className="es-menu-trigger"
              >
                {label}
              </button>
            ))}
            <div className="flex-1" />
            <span className="flex items-center gap-1 pr-1 es-typo-caption text-es-secondary">
              <Logomark size={12} aria-hidden />
              <span>ElectroSim</span>
            </span>
          </nav>
        </section>

        <section data-testid="gallery-toolbar">
          <h2 className="mb-2 es-typo-label uppercase text-es-secondary">Toolbar</h2>
          <div className="flex h-10 select-none items-center gap-1 rounded-es-md border border-es-borderSubtle bg-es-chrome1 px-2">
            <SegmentedControl
              ariaLabel="Drawing tools"
              value={tool}
              onChange={setTool}
              items={[
                { id: 'select', label: 'Select' },
                { id: 'wire', label: 'Wire' },
                { id: 'delete', label: 'Delete' },
                { id: 'pan', label: 'Pan' },
              ]}
            />
            <div className="mx-1 h-5 w-px bg-es-divider" aria-hidden />
            <div className="flex-1" />
            <Button variant="primary" size="md">
              Simulate
            </Button>
          </div>
        </section>

        <section data-testid="gallery-inspector">
          <h2 className="mb-2 es-typo-label uppercase text-es-secondary">Inspector</h2>
          <div className="es-inspector-root flex min-h-[220px] flex-col overflow-hidden rounded-es-md border border-es-borderSubtle bg-es-chrome2 shadow-[var(--es-shadow-panel)]">
            <Tabs
              items={INSPECTOR_TABS}
              value={inspectorTab}
              onChange={setInspectorTab}
              ariaLabel="Inspector panels"
              className="es-inspector-tablist"
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <SelectionHeaderCard
                label="Q1"
                typeName="MCB — Miniature circuit breaker"
                layerLabel="Power"
                status={{ energized: true, faultCount: 0, tripped: false }}
              />
              <div className="es-density-pad space-y-2">
                <label className="es-typo-label text-es-secondary" htmlFor="gallery-label">
                  Label
                </label>
                <Input id="gallery-label" defaultValue="Q1" readOnly />
              </div>
            </div>
          </div>
        </section>

        <section data-testid="gallery-dialog" className="relative">
          <h2 className="mb-2 es-typo-label uppercase text-es-secondary">Dialog</h2>
          <div className="relative h-72 overflow-hidden rounded-es-md border border-es-borderSubtle bg-es-canvas">
            <Dialog
              open
              title="Project settings"
              onClose={() => undefined}
              maxWidth="sm"
              className="!relative !max-h-none !shadow-none"
              overlayClassName="!relative !inset-auto !bg-transparent !p-0 !items-stretch !justify-stretch"
              bodyClassName="space-y-3"
              footer={
                <>
                  <Button variant="secondary">Cancel</Button>
                  <Button variant="primary">Save</Button>
                </>
              }
            >
              <p className="es-typo-body-sm text-es-secondary">
                Title block and revision defaults for PDF export.
              </p>
              <Input aria-label="Drawing number" defaultValue="EL-100" readOnly />
            </Dialog>
          </div>
        </section>
      </main>
    </div>
  );
};

export default UiGallery;
