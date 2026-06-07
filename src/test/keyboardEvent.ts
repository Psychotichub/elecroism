/** Build a keyboard event for shortcut-store / global shortcut tests. */
export function keyboardEvent(init: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  target?: EventTarget | null;
}): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: init.key,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    shiftKey: init.shiftKey ?? false,
    altKey: init.altKey ?? false,
    bubbles: true,
    cancelable: true,
  });
}

export function dispatchKey(
  init: Parameters<typeof keyboardEvent>[0]
): KeyboardEvent {
  const event = keyboardEvent(init);
  const target = init.target ?? document.body;
  target.dispatchEvent(event);
  return event;
}
