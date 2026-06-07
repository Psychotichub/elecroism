/** Standard icon sizes — inline labels, toolbar chrome, panel headers. */
export const ICON_SIZES = {
  inline: 14,
  toolbar: 16,
  panel: 18,
} as const;

export type IconSizeKey = keyof typeof ICON_SIZES;

export type SemanticIconId =
  | 'tool-select'
  | 'tool-wire'
  | 'tool-pan'
  | 'tool-delete'
  | 'simulate'
  | 'validation'
  | 'validation-error'
  | 'validation-warning'
  | 'validation-info'
  | 'learning'
  | 'tutorial'
  | 'challenge'
  | 'assignment'
  | 'examples'
  | 'export'
  | 'undo'
  | 'redo'
  | 'fit-screen'
  | 'zoom-in'
  | 'command-palette'
  | 'toggle-object-snap'
  | 'export-pdf'
  | 'cycle-theme'
  | 'theme-light'
  | 'theme-dark'
  | 'theme-high-contrast'
  | 'settings'
  | 'macro'
  | 'starter'
  | 'close'
  | 'chevron-down'
  | 'chevron-right'
  | 'add'
  | 'copy'
  | 'download';

export const SEMANTIC_ICON_IDS: readonly SemanticIconId[] = [
  'tool-select',
  'tool-wire',
  'tool-pan',
  'tool-delete',
  'simulate',
  'validation',
  'validation-error',
  'validation-warning',
  'validation-info',
  'learning',
  'tutorial',
  'challenge',
  'assignment',
  'examples',
  'export',
  'undo',
  'redo',
  'fit-screen',
  'zoom-in',
  'command-palette',
  'toggle-object-snap',
  'export-pdf',
  'cycle-theme',
  'theme-light',
  'theme-dark',
  'theme-high-contrast',
  'settings',
  'macro',
  'starter',
  'close',
  'chevron-down',
  'chevron-right',
  'add',
  'copy',
  'download',
] as const;

export function iconPixelSize(size: IconSizeKey | number = 'toolbar'): number {
  return typeof size === 'number' ? size : ICON_SIZES[size];
}
