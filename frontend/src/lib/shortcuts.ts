import {
  formatForDisplay,
  getHotkeyManager,
  getSequenceManager,
  normalizeHotkey,
  normalizeRegisterableHotkey,
  type RegisterableHotkey,
} from "@tanstack/react-hotkeys";
import type { RegisteredRouter } from "@tanstack/react-router";
import type { FeatureFlags } from "@/api/generated/model";
import type { TranslationKey } from "@/lib/i18n";

export const PREFIX_TIMEOUT_MS = 1200;

const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="combobox"], [role="textbox"]';

const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]';

const SEARCH_TARGET_SELECTOR = '[data-shortcut="search"]';

export type ShortcutFeature = keyof FeatureFlags;

const DISABLED_PATHS = new Set([
  "/login",
  "/setup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

type ShortcutAction =
  | { type: "navigate"; to: string; search?: Record<string, unknown> }
  | { type: "search" }
  | { type: "help" }
  | { type: "palette" };

export interface Shortcut {
  id: string;
  keys: readonly string[];
  labelKey: TranslationKey;
  group: "actions" | "goTo";
  action: ShortcutAction;
  feature?: ShortcutFeature;
}

function goTo(
  key: string,
  to: string,
  labelKey: TranslationKey,
  feature?: ShortcutFeature,
): Shortcut {
  return {
    id: `go-${key}`,
    keys: ["g", key],
    labelKey,
    group: "goTo",
    action: { type: "navigate", to },
    feature,
  };
}

export const shortcuts: readonly Shortcut[] = [
  {
    id: "command-palette",
    keys: ["Mod+K"],
    labelKey: "commandPalette.title",
    group: "actions",
    action: { type: "palette" },
  },
  {
    id: "new-transaction",
    keys: ["n"],
    labelKey: "shortcuts.newTransaction",
    group: "actions",
    action: { type: "navigate", to: "/transactions", search: { new: true } },
  },
  {
    id: "search",
    keys: ["/"],
    labelKey: "shortcuts.search",
    group: "actions",
    action: { type: "search" },
  },
  {
    id: "help",
    keys: ["?"],
    labelKey: "shortcuts.help",
    group: "actions",
    action: { type: "help" },
  },
  goTo("d", "/", "nav.dashboard"),
  goTo("t", "/transactions", "nav.transactions"),
  goTo("a", "/accounts", "nav.accounts"),
  goTo("c", "/categories", "nav.categories"),
  goTo("u", "/categorization-rules", "nav.categorizationRules", "categorizationRules"),
  goTo("b", "/budgets", "nav.budgets", "budgets"),
  goTo("o", "/goals", "nav.goals", "goals"),
  goTo("l", "/recurring-bills", "nav.recurringBills", "recurringBills"),
  goTo("w", "/net-worth", "nav.netWorth", "netWorth"),
  goTo("v", "/investments", "nav.investments", "investments"),
  goTo("r", "/reports", "nav.reports", "reports"),
  goTo("h", "/households", "nav.households", "households"),
];

export function visibleShortcuts(isFeatureEnabled: (feature: ShortcutFeature) => boolean) {
  return shortcuts.filter(
    (shortcut) => shortcut.feature === undefined || isFeatureEnabled(shortcut.feature),
  );
}

export function isModifierShortcut(shortcut: Shortcut) {
  return shortcut.keys.some((key) => key.includes("+"));
}

export function shortcutKeyLabel(key: string) {
  return key.includes("+") ? formatForDisplay(key) : key;
}

interface ShortcutContext {
  defaultPrevented: boolean;
  repeat: boolean;
  editableTarget: boolean;
  dialogOpen: boolean;
  pathname: string;
  modified?: boolean;
}

export function shouldIgnoreShortcut(context: ShortcutContext) {
  return (
    context.defaultPrevented ||
    context.repeat ||
    (context.editableTarget && context.modified !== true) ||
    context.dialogOpen ||
    DISABLED_PATHS.has(context.pathname)
  );
}

export function toHotkeySteps(shortcut: Shortcut): RegisterableHotkey[] {
  return shortcut.keys.map((key) => (key === "?" ? { key, shift: true } : normalizeHotkey(key)));
}

export interface ShortcutRouter {
  state: { location: { pathname: string } };
  navigate: (options: { to: string; search?: Record<string, unknown> }) => unknown;
}

export interface ShortcutRuntime {
  toggleHelp: () => void;
  isHelpOpen: () => boolean;
  togglePalette: () => void;
  isPaletteOpen: () => boolean;
  isFeatureEnabled: (feature: ShortcutFeature) => boolean;
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null;
}

function focusSearchTarget() {
  const target = document.querySelector<HTMLElement>(SEARCH_TARGET_SELECTOR);
  if (!target) {
    return false;
  }

  if (target.matches("input, textarea")) {
    target.focus();
  } else {
    target.click();
  }
  return true;
}

function alwaysFalse() {
  return false;
}

function alwaysTrue() {
  return true;
}

const HOTKEY_OPTIONS = { preventDefault: false, stopPropagation: false } as const;

export function registerShortcuts(
  router: RegisteredRouter | ShortcutRouter,
  runtime: Partial<ShortcutRuntime> = {},
) {
  const target = router as ShortcutRouter;
  const isHelpOpen = runtime.isHelpOpen ?? alwaysFalse;
  const isPaletteOpen = runtime.isPaletteOpen ?? alwaysFalse;
  const isFeatureEnabled = runtime.isFeatureEnabled ?? alwaysTrue;

  function otherDialogOpen() {
    if (isHelpOpen() || isPaletteOpen()) {
      return false;
    }
    return document.querySelector(DIALOG_SELECTOR) !== null;
  }

  function runAction(event: KeyboardEvent, action: ShortcutAction, modified: boolean) {
    const ignored = shouldIgnoreShortcut({
      defaultPrevented: event.defaultPrevented,
      repeat: event.repeat,
      editableTarget: isEditableTarget(event.target),
      dialogOpen: otherDialogOpen(),
      pathname: target.state.location.pathname,
      modified,
    });

    if (ignored) {
      return;
    }

    event.preventDefault();

    if (action.type === "help") {
      runtime.toggleHelp?.();
      return;
    }

    if (isHelpOpen()) {
      runtime.toggleHelp?.();
    }

    if (action.type === "palette") {
      runtime.togglePalette?.();
      return;
    }

    if (action.type === "search") {
      if (!focusSearchTarget()) {
        void target.navigate({ to: "/transactions" });
      }
      return;
    }

    void target.navigate({ to: action.to, search: action.search });
  }

  const handles = shortcuts.map((shortcut) => {
    const steps = toHotkeySteps(shortcut);
    const [first, ...rest] = steps;
    const modified = isModifierShortcut(shortcut);

    function callback(event: KeyboardEvent) {
      if (shortcut.feature !== undefined && !isFeatureEnabled(shortcut.feature)) {
        return;
      }
      runAction(event, shortcut.action, modified);
    }

    if (first !== undefined && rest.length === 0) {
      return getHotkeyManager().register(first, callback, HOTKEY_OPTIONS);
    }

    const sequence = steps.map((step) => normalizeRegisterableHotkey(step));
    return getSequenceManager().register(sequence, callback, {
      ...HOTKEY_OPTIONS,
      timeout: PREFIX_TIMEOUT_MS,
    });
  });

  return function unregisterShortcuts() {
    for (const handle of handles) {
      handle.unregister();
    }
  };
}
