import React from 'react';
import type { ComponentType } from '../../types';
import { useThemeStore, themeColors } from '../../store/themeStore';
import {
  FiZap,
  FiShield,
  FiToggleLeft,
  FiCircle,
  FiSun,
  FiActivity,
  FiLink,
} from 'react-icons/fi';

interface ComponentItem {
  type: ComponentType;
  label: string;
  icon: React.ReactNode;
  detail?: string;
  /** Single-phase MCB palette: drop as 2-pole (L+N) layout. */
  mcbInitialPoles?: 1 | 2;
}

interface ComponentGroup {
  name: string;
  emoji: string;
  items: ComponentItem[];
}

const GROUPS: ComponentGroup[] = [
  {
    name: 'Power',
    emoji: '⚡',
    items: [
      { type: 'power_source', label: 'AC Source 230V', icon: <FiZap /> },
      {
        type: 'three_phase_source',
        label: '3φ Supply 400V',
        icon: <FiZap />,
        detail: 'L1 L2 L3 + N',
      },
      { type: 'busbar', label: 'Busbar (L)', icon: <FiActivity />, detail: 'Live' },
      { type: 'busbar', label: 'Busbar (N)', icon: <FiActivity />, detail: 'Neutral' },
      { type: 'busbar', label: 'Busbar (PE)', icon: <FiActivity />, detail: 'Earth' },
    ],
  },
  {
    name: 'Protection',
    emoji: '🛡️',
    items: [
      {
        type: 'mcb',
        label: 'MCB',
        icon: <FiShield />,
        detail: '1P · set rating in properties',
      },
      { type: 'rcd', label: 'RCD', icon: <FiShield />, detail: 'Set sensitivity in properties' },
      { type: 'overload_relay', label: 'Overload Relay', icon: <FiShield /> },
      {
        type: 'three_phase_mcb',
        label: '3P MCB',
        icon: <FiShield />,
        detail: 'L1–L3 · rating in properties',
      },
      {
        type: 'four_phase_mcb',
        label: '4P MCB',
        icon: <FiShield />,
        detail: 'L1–L3 + N · rating in properties',
      },
    ],
  },
  {
    name: 'Controls',
    emoji: '🎛️',
    items: [
      {
        type: 'switch',
        label: 'Switch',
        icon: <FiToggleLeft />,
        detail: 'SPST / DPST in properties',
      },
      {
        type: 'push_button',
        label: 'Push button',
        icon: <FiCircle />,
        detail: 'NO / NC in properties',
      },
      { type: 'contactor', label: 'Contactor', icon: <FiToggleLeft /> },
      { type: 'relay', label: 'Relay', icon: <FiToggleLeft /> },
      { type: 'timer', label: 'Timer', icon: <FiToggleLeft /> },
      {
        type: 'three_phase_contactor',
        label: '3P Contactor (KM)',
        icon: <FiToggleLeft />,
        detail: 'L1–L3 + A1 A2',
      },
      {
        type: 'four_phase_contactor',
        label: '4P Contactor (KM)',
        icon: <FiToggleLeft />,
        detail: 'L1–L3–N + A1 A2',
      },
    ],
  },
  {
    name: 'Outlets',
    emoji: '🔌',
    items: [
      {
        type: 'socket',
        label: 'Socket',
        icon: <FiCircle />,
        detail: 'Schuko · rating in properties',
      },
    ],
  },
  {
    name: 'Loads',
    emoji: '💡',
    items: [
      { type: 'lamp', label: 'Lamp', icon: <FiSun />, detail: 'Power in properties' },
      { type: 'motor', label: 'Motor', icon: <FiActivity />, detail: '1φ · power in properties' },
      {
        type: 'three_phase_motor',
        label: '3φ Motor',
        icon: <FiActivity />,
        detail: 'Wye · power in properties',
      },
      { type: 'heater', label: 'Heater', icon: <FiSun />, detail: 'Power in properties' },
      { type: 'generic_load', label: 'Generic load', icon: <FiCircle /> },
    ],
  },
  {
    name: 'Wiring',
    emoji: '🔗',
    items: [
      { type: 'junction', label: 'Junction Point', icon: <FiLink /> },
    ],
  },
];

const Sidebar: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];

  const handleDragStart = (e: React.DragEvent, item: ComponentItem) => {
    e.dataTransfer.setData('componentType', item.type);
    if (item.type === 'push_button') {
      e.dataTransfer.setData('pushButtonVariant', 'NO');
    } else {
      e.dataTransfer.setData('pushButtonVariant', '');
    }
    if (item.type === 'mcb' && item.mcbInitialPoles === 2) {
      e.dataTransfer.setData('mcbInitialPoles', '2');
    } else {
      e.dataTransfer.setData('mcbInitialPoles', '');
    }
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className={`w-56 ${tc.sidebar} ${tc.text} flex flex-col overflow-y-auto select-none border-r ${tc.border}`}>
      <div className={`px-3 py-3 border-b ${tc.border}`}>
        <h2 className={`text-sm font-bold ${tc.textBright} tracking-wide`}>
          Components
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {GROUPS.map((group) => (
          <div key={group.name} className="mb-1">
            <div className={`px-3 py-1.5 text-xs font-semibold ${tc.groupLabel} uppercase tracking-wider`}>
              {group.emoji} {group.name}
            </div>
            {group.items.map((item, idx) => (
              <div
                key={`${item.type}-${idx}`}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                className={`flex items-center gap-2 px-3 py-1.5 mx-1 rounded cursor-grab ${tc.itemHover} transition-colors active:cursor-grabbing`}
              >
                <span className={`text-base ${tc.groupLabel}`}>
                  {item.icon}
                </span>
                <div className="flex flex-col">
                  <span className={`text-xs ${tc.text}`}>
                    {item.label}
                  </span>
                  {item.detail && (
                    <span className={`text-[10px] ${tc.textMuted}`}>
                      {item.detail}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
