const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"], [role="spinbutton"]';
const CONTROL = 'button, summary, a[href], [role="button"], [role="menuitem"], [role="tab"], [role="treeitem"]';

/** The workspace must not take input owned by a dialog, editor or earlier handler. */
export function shouldIgnoreWorkspaceEvent(event: Event, ownedSliderScope?: Element | null): boolean {
  if (event.defaultPrevented) return true;
  if (document.querySelector('dialog[open], [aria-modal="true"][role="dialog"]:not([hidden]):not([aria-hidden="true"]), [aria-modal="true"][role="alertdialog"]:not([hidden]):not([aria-hidden="true"])')) return true;
  const targets = [...event.composedPath(), event.target, document.activeElement];
  return targets.some(target => {
    if (!(target instanceof Element)) return false;
    if (target.closest(EDITABLE)) return true;
    const slider = target.closest('[role="slider"]');
    return Boolean(slider && !ownedSliderScope?.contains(slider));
  });
}

export function shouldIgnoreWorkspaceKey(event: KeyboardEvent, ownedSliderScope?: Element | null): boolean {
  return shouldIgnoreWorkspaceEvent(event, ownedSliderScope) || event.isComposing || event.keyCode === 229 ||
    event.key === 'Dead' || event.key === 'Process' || event.getModifierState('AltGraph');
}

/** Letters use QWERTY positions. Symbols/navigation keep their produced key. */
export function workspaceShortcutKey(event: KeyboardEvent): string {
  const letter = /^Key([A-Z])$/.exec(event.code);
  return letter ? letter[1].toLowerCase() : event.key.toLowerCase();
}

export function isWorkspaceControlTarget(event: Event): boolean {
  return event.composedPath().some(target => target instanceof Element && Boolean(target.closest(CONTROL)));
}
