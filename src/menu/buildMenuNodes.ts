import type { SemanticIconId } from '../design/icons';
import { useShortcutStore } from '../store/shortcutStore';
import { executeShortcutAction } from '../shortcuts/executeShortcutAction';
import {
  shortcutActionLabel,
  type ShortcutActionId,
} from '../shortcuts/shortcutRegistry';

export type MenuAction = {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  iconId?: SemanticIconId;
  onClick?: () => void;
};

export type MenuNode =
  | { kind: 'action'; action: MenuAction }
  | { kind: 'separator' }
  | { kind: 'heading'; label: string }
  | {
      kind: 'submenu';
      label: string;
      children: MenuNode[];
      iconId?: SemanticIconId;
    };

/** Build a renderer menu node from a shared native menu action id. */
export function menuActionNode(
  id: ShortcutActionId,
  overrides?: Partial<MenuAction>
): MenuNode {
  return {
    kind: 'action',
    action: {
      label: overrides?.label ?? shortcutActionLabel(id),
      shortcut:
        overrides?.shortcut ??
        useShortcutStore.getState().getBinding(id) ??
        undefined,
      disabled: overrides?.disabled,
      checked: overrides?.checked,
      onClick: overrides?.onClick ?? (() => void executeShortcutAction(id)),
    },
  };
}
