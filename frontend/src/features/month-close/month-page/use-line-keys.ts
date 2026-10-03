import { useHotkey } from "@tanstack/react-hotkeys";
import type { RefObject } from "react";

const LINE_SELECTOR = "[data-open-line]";
const CONTROL_SELECTOR = "[data-line-control]";
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]';
const HOTKEY_OPTIONS = { preventDefault: false, stopPropagation: false } as const;

function openLines(root: HTMLElement | null) {
  return root ? [...root.querySelectorAll<HTMLElement>(LINE_SELECTOR)] : [];
}

function lineControl(line: Element) {
  const marked = line.querySelector<HTMLElement>(CONTROL_SELECTOR);
  if (!marked || marked.matches("button, a")) {
    return marked;
  }
  return marked.querySelector<HTMLElement>("button, a");
}

function openLineControl(event: KeyboardEvent) {
  const { target } = event;
  const control =
    target instanceof HTMLElement && target.matches(LINE_SELECTOR) ? lineControl(target) : null;
  if (!control) {
    return;
  }
  event.preventDefault();
  control.focus();
  control.click();
}

export function useLineKeys(root: RefObject<HTMLElement | null>) {
  function step(event: KeyboardEvent, delta: 1 | -1) {
    const lines = openLines(root.current);
    if (lines.length === 0 || document.querySelector(DIALOG_SELECTOR)) {
      return;
    }
    event.preventDefault();
    const current = lines.findIndex((line) => line.contains(document.activeElement));
    const start = delta === 1 ? -1 : lines.length;
    const next = Math.min(
      lines.length - 1,
      Math.max(0, (current === -1 ? start : current) + delta),
    );
    lines[next]?.focus();
  }

  useHotkey("J", (event) => step(event, 1), HOTKEY_OPTIONS);
  useHotkey("K", (event) => step(event, -1), HOTKEY_OPTIONS);
  useHotkey("Enter", openLineControl, { ...HOTKEY_OPTIONS, target: root });
}
