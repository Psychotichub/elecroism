import React from 'react';
import type { IconType } from 'react-icons';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiBook,
  FiBookOpen,
  FiChevronDown,
  FiChevronRight,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiCopy,
  FiDownload,
  FiFileText,
  FiGrid,
  FiInfo,
  FiLayers,
  FiMaximize,
  FiMoon,
  FiPlay,
  FiPlus,
  FiSearch,
  FiSettings,
  FiSun,
  FiTarget,
  FiTrash2,
  FiX,
  FiZap,
  FiZoomIn,
} from 'react-icons/fi';
import {
  PanToolIcon,
  SelectToolIcon,
  WireToolIcon,
} from './customToolIcons';
import {
  iconPixelSize,
  type IconSizeKey,
  type SemanticIconId,
} from './icons';

type CustomIcon = React.FC<React.SVGProps<SVGSVGElement>>;

type IconEntry =
  | { kind: 'fi'; Icon: IconType }
  | { kind: 'custom'; Icon: CustomIcon };

const SEMANTIC_ICONS: Record<SemanticIconId, IconEntry> = {
  'tool-select': { kind: 'custom', Icon: SelectToolIcon },
  'tool-wire': { kind: 'custom', Icon: WireToolIcon },
  'tool-pan': { kind: 'custom', Icon: PanToolIcon },
  'tool-delete': { kind: 'fi', Icon: FiTrash2 },
  simulate: { kind: 'fi', Icon: FiPlay },
  validation: { kind: 'fi', Icon: FiAlertTriangle },
  'validation-error': { kind: 'fi', Icon: FiAlertCircle },
  'validation-warning': { kind: 'fi', Icon: FiAlertTriangle },
  'validation-info': { kind: 'fi', Icon: FiInfo },
  learning: { kind: 'fi', Icon: FiBook },
  tutorial: { kind: 'fi', Icon: FiBook },
  challenge: { kind: 'fi', Icon: FiTarget },
  assignment: { kind: 'fi', Icon: FiBookOpen },
  examples: { kind: 'fi', Icon: FiBookOpen },
  export: { kind: 'fi', Icon: FiDownload },
  undo: { kind: 'fi', Icon: FiCornerUpLeft },
  redo: { kind: 'fi', Icon: FiCornerUpRight },
  'fit-screen': { kind: 'fi', Icon: FiMaximize },
  'zoom-in': { kind: 'fi', Icon: FiZoomIn },
  'command-palette': { kind: 'fi', Icon: FiSearch },
  'toggle-object-snap': { kind: 'fi', Icon: FiGrid },
  'export-pdf': { kind: 'fi', Icon: FiFileText },
  'cycle-theme': { kind: 'fi', Icon: FiSun },
  'theme-light': { kind: 'fi', Icon: FiSun },
  'theme-dark': { kind: 'fi', Icon: FiMoon },
  'theme-high-contrast': { kind: 'fi', Icon: FiMaximize },
  settings: { kind: 'fi', Icon: FiSettings },
  macro: { kind: 'fi', Icon: FiLayers },
  starter: { kind: 'fi', Icon: FiZap },
  close: { kind: 'fi', Icon: FiX },
  'chevron-down': { kind: 'fi', Icon: FiChevronDown },
  'chevron-right': { kind: 'fi', Icon: FiChevronRight },
  add: { kind: 'fi', Icon: FiPlus },
  copy: { kind: 'fi', Icon: FiCopy },
  download: { kind: 'fi', Icon: FiDownload },
};

export type AppIconProps = {
  id: SemanticIconId;
  size?: IconSizeKey | number;
  className?: string;
  'aria-hidden'?: boolean;
};

export default function AppIcon({
  id,
  size = 'toolbar',
  className,
  'aria-hidden': ariaHidden = true,
}: AppIconProps): React.ReactElement {
  const px = iconPixelSize(size);
  const entry = SEMANTIC_ICONS[id];
  if (entry.kind === 'custom') {
    const Custom = entry.Icon;
    return (
      <Custom
        width={px}
        height={px}
        className={className}
        aria-hidden={ariaHidden}
      />
    );
  }
  const Fi = entry.Icon;
  return <Fi size={px} className={className} aria-hidden={ariaHidden} />;
}
