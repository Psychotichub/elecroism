import type { PluginManifest } from '../types/plugin';

/** Bundled example plugin — also published as `plugins/example-warning-beacon.eplugin.json`. */
export const EXAMPLE_PLUGIN_MANIFEST: PluginManifest = {
  version: '1.0',
  id: 'com.electrosim.example-warning-beacon',
  name: 'Example Warning Beacon Pack',
  author: 'ElectroSim',
  description:
    'Template plugin demonstrating JSON-defined symbols, property editors, and simulation models.',
  minAppVersion: '0.0.0',
  componentTypes: [
    {
      id: 'warning_beacon',
      label: 'Warning Beacon',
      category: 'Control',
      description: 'Amber panel beacon modeled as a resistive load (L/N).',
      symbol: {
        shape: 'circle',
        width: 28,
        height: 28,
        glyph: 'WB',
        fill: '#F59E0B',
        stroke: '#B45309',
      },
      terminals: [
        { id: 'l', label: 'L', x: -18, y: 0 },
        { id: 'n', label: 'N', x: 18, y: 0 },
      ],
      defaultProperties: {
        powerWatts: 25,
        ratingAmps: 2,
      },
      propertyFields: [
        {
          key: 'powerWatts',
          label: 'Power (W)',
          type: 'number',
          min: 1,
          max: 500,
          step: 1,
        },
        {
          key: 'ratingAmps',
          label: 'Circuit rating (A)',
          type: 'number',
          min: 1,
          max: 32,
          step: 1,
        },
      ],
      simulation: {
        model: 'resistive_load',
        liveTerminal: 'L',
        neutralTerminal: 'N',
        powerProperty: 'powerWatts',
        defaultState: 'on',
      },
    },
    {
      id: 'aux_switch',
      label: 'Auxiliary Switch',
      category: 'Control',
      description: 'Single-pole auxiliary contact (pass-through when ON).',
      symbol: {
        shape: 'rect',
        width: 36,
        height: 20,
        glyph: 'SW',
        fill: '#E2E8F0',
        stroke: '#475569',
      },
      terminals: [
        { id: 'in', label: 'IN', x: -20, y: 0 },
        { id: 'out', label: 'OUT', x: 20, y: 0 },
      ],
      propertyFields: [
        {
          key: 'notes',
          label: 'Notes',
          type: 'text',
          placeholder: 'e.g. Fire alarm aux',
        },
      ],
      simulation: {
        model: 'pass_through',
        conductingStates: ['on'],
        defaultState: 'on',
      },
      toggleable: true,
    },
  ],
};
