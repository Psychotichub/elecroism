/** Normalize a shortcut string for comparison (case-insensitive, canonical modifiers). */
export function normalizeShortcut(value: string): string {
  const parts = value
    .split('+')
    .map((p) => p.trim())
    .filter(Boolean);
  const modifiers = new Set<string>();
  let key = '';

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'ctrl' || lower === 'control' || lower === 'cmd' || lower === 'meta') {
      modifiers.add('ctrl');
    } else if (lower === 'alt' || lower === 'option') {
      modifiers.add('alt');
    } else if (lower === 'shift') {
      modifiers.add('shift');
    } else if (lower === 'space' || part === ' ') {
      key = 'space';
    } else {
      key = lower.length === 1 ? lower : lower;
    }
  }

  const ordered: string[] = [];
  if (modifiers.has('ctrl')) ordered.push('ctrl');
  if (modifiers.has('alt')) ordered.push('alt');
  if (modifiers.has('shift')) ordered.push('shift');
  if (key) ordered.push(key);
  return ordered.join('+');
}

/** Convert a keyboard event to a display/canonical shortcut string. */
export function eventToShortcut(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  else if (key === 'Delete') key = 'Delete';
  else if (key === 'Backspace') key = 'Backspace';
  else if (key.startsWith('Arrow')) key = key.replace('Arrow', '');

  parts.push(key);
  return parts.join('+');
}

/** True when the event matches a stored shortcut binding. */
export function matchesShortcut(e: KeyboardEvent, binding: string): boolean {
  const expected = normalizeShortcut(binding);
  const actual = normalizeShortcut(eventToShortcut(e));
  return expected === actual;
}

/** Whether a captured combo is valid for assignment (not empty modifier-only). */
export function isValidCapture(e: KeyboardEvent): boolean {
  if (e.key === 'Escape') return false;
  const ignore = new Set(['Control', 'Shift', 'Alt', 'Meta']);
  return !ignore.has(e.key);
}
