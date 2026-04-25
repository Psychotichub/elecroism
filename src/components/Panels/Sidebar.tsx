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
      { type: 'busbar', label: 'Busbar (L)', icon: <FiActivity />, detail: 'Live' },
      { type: 'busbar', label: 'Busbar (N)', icon: <FiActivity />, detail: 'Neutral' },
      { type: 'busbar', label: 'Busbar (PE)', icon: <FiActivity />, detail: 'Earth' },
    ],
  },
  {
    name: 'Protection',
    emoji: '🛡️',
    items: [
      { type: 'mcb', label: 'MCB 6A', icon: <FiShield />, detail: '6A' },
      { type: 'mcb', label: 'MCB 10A', icon: <FiShield />, detail: '10A' },
      { type: 'mcb', label: 'MCB 16A', icon: <FiShield />, detail: '16A' },
      { type: 'mcb', label: 'MCB 32A', icon: <FiShield />, detail: '32A' },
      { type: 'rcd', label: 'RCD 30mA', icon: <FiShield />, detail: '30mA' },
      { type: 'overload_relay', label: 'Overload Relay', icon: <FiShield /> },
    ],
  },
  {
    name: 'Controls',
    emoji: '🎛️',
    items: [
      { type: 'switch', label: 'Switch (SPST)', icon: <FiToggleLeft /> },
      { type: 'switch', label: 'Switch (DPST)', icon: <FiToggleLeft />, detail: 'DPST' },
      { type: 'push_button', label: 'Push Button NO', icon: <FiCircle />, detail: 'NO' },
      { type: 'push_button', label: 'Push Button NC', icon: <FiCircle />, detail: 'NC' },
      { type: 'contactor', label: 'Contactor', icon: <FiToggleLeft /> },
      { type: 'relay', label: 'Relay', icon: <FiToggleLeft /> },
      { type: 'timer', label: 'Timer', icon: <FiToggleLeft /> },
    ],
  },
  {
    name: 'Outlets',
    emoji: '🔌',
    items: [
      { type: 'socket', label: 'Socket 16A', icon: <FiCircle /> },
      { type: 'socket', label: 'Socket 32A', icon: <FiCircle />, detail: 'Heavy Duty' },
    ],
  },
  {
    name: 'Loads',
    emoji: '💡',
    items: [
      { type: 'lamp', label: 'Lamp 60W', icon: <FiSun /> },
      { type: 'motor', label: 'Motor 1kW', icon: <FiActivity /> },
      { type: 'heater', label: 'Heater 2kW', icon: <FiSun /> },
      { type: 'generic_load', label: 'Generic Load', icon: <FiCircle /> },
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

  const handleDragStart = (
    e: React.DragEvent,
    type: ComponentType
  ) => {
    e.dataTransfer.setData('componentType', type);
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
                onDragStart={(e) => handleDragStart(e, item.type)}
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
