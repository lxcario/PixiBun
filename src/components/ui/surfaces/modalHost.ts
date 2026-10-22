import { useSyncExternalStore } from 'react';

/*
 * The dialogs currently in the top layer, in the order they opened.
 *
 * A modal dialog makes the rest of the page inert, so a message shown outside it
 * (the studio toast) is neither announced nor reachable while the dialog is open.
 * Surfaces that must stay perceivable portal into the topmost dialog instead.
 */
let stack: readonly HTMLDialogElement[] = [];
const listeners = new Set<() => void>();

function publish(next: readonly HTMLDialogElement[]) {
  stack = next;
  listeners.forEach(listener => listener());
}

/** Called by a dialog once it is modal. Opening again moves it to the top. */
export function registerModalHost(dialog: HTMLDialogElement): void {
  publish([...stack.filter(entry => entry !== dialog), dialog]);
}

/** Called as soon as a dialog leaves the top layer. Unknown dialogs are ignored. */
export function unregisterModalHost(dialog: HTMLDialogElement): void {
  if (stack.includes(dialog)) publish(stack.filter(entry => entry !== dialog));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const topmost = () => stack[stack.length - 1] ?? null;
const none = () => null;

/** The topmost open modal dialog, or null when none is open. */
export function useTopModalHost(): HTMLDialogElement | null {
  return useSyncExternalStore(subscribe, topmost, none);
}
