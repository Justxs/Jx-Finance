import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import plugin from "./code-rules.mjs";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: { sourceType: "module", parserOptions: { lang: "tsx" } },
});

const pageFile = "/app/src/features/transactions/transactions-page/transactions-page.tsx";
const allow = [{ allow: { transactions: ["imports/import-dialog/import-dialog"] } }];

tester.run("no-cross-feature-import", plugin.rules["no-cross-feature-import"], {
  valid: [
    { code: `import { x } from "@/features/transactions/a/a";`, filename: pageFile },
    { code: `import { x } from "@/components/a/a";`, filename: pageFile },
    { code: `import { x } from "./table";`, filename: pageFile },
    {
      code: `import { ImportDialog } from "@/features/imports/import-dialog/import-dialog";`,
      filename: pageFile,
      options: allow,
    },
    { code: `import { x } from "@/features/goals/a/a";`, filename: "/app/src/routes/goals.tsx" },
    { code: `import { x } from "@/features/goals/a/a";`, filename: "/app/src/features/a.test.tsx" },
  ],
  invalid: [
    { code: `import { x } from "@/features/goals/a/a";`, filename: pageFile, errors: 1 },
    { code: `import { x } from "../../goals/a/a";`, filename: pageFile, errors: 1 },
    { code: `export { x } from "@/features/goals/a/a";`, filename: pageFile, errors: 1 },
    { code: `await import("@/features/goals/a/a");`, filename: pageFile, errors: 1 },
    {
      code: `import { ReconcileDialog } from "@/features/accounts/reconcile-dialog/reconcile-dialog";`,
      filename: pageFile,
      options: allow,
      errors: 1,
    },
    {
      code: `import { x } from "@/features/goals/a/a";`,
      filename: "C:\\app\\src\\features\\transactions\\a\\a.tsx",
      errors: 1,
    },
  ],
});

tester.run("no-key-listener", plugin.rules["no-key-listener"], {
  valid: [
    `query.addEventListener("change", onChange);`,
    `button.addEventListener("click", onClick);`,
  ],
  invalid: [
    { code: `window.addEventListener("keydown", onKey);`, errors: 1 },
    { code: `document.addEventListener("keyup", onKey, { capture: true });`, errors: 1 },
  ],
});

tester.run("no-raw-browser-api", plugin.rules["no-raw-browser-api"], {
  valid: [
    `const setTimeout = later; setTimeout(run, 10);`,
    `function save(localStorage) { localStorage.setItem("a", "b"); }`,
    `storage.setItem("a", "b");`,
    `debouncer.setTimeout(run);`,
  ],
  invalid: [
    { code: `localStorage.setItem("a", "b");`, errors: 1 },
    { code: `sessionStorage.clear();`, errors: 1 },
    { code: `setTimeout(run, 10);`, errors: 1 },
    { code: `setInterval(run, 10);`, errors: 1 },
    { code: `window.localStorage.getItem("a");`, errors: 1 },
    { code: `globalThis.setTimeout(run);`, errors: 1 },
    { code: `window["sessionStorage"].clear();`, errors: 1 },
  ],
});

const uiFile = "/app/src/components/ui/calendar/calendar.tsx";
const sharedFile = "/app/src/lib/budgets.ts";

tester.run("layer-imports", plugin.rules["layer-imports"], {
  valid: [
    { code: `import { Button } from "@/components/ui/button/button";`, filename: uiFile },
    { code: `import { cn } from "@/lib/utils";`, filename: uiFile },
    { code: `import { useSettings } from "@/hooks/use-settings";`, filename: sharedFile },
    { code: `import { Money } from "@/components/money/money";`, filename: sharedFile },
    {
      code: `import { x } from "@/features/goals/a/a";`,
      filename: "/app/src/routes/goals.tsx",
    },
  ],
  invalid: [
    { code: `import { useSettings } from "@/hooks/use-settings";`, filename: uiFile, errors: 1 },
    { code: `import { x } from "@/api/generated";`, filename: uiFile, errors: 1 },
    { code: `import { x } from "@/stores/theme-store";`, filename: uiFile, errors: 1 },
    { code: `import { Money } from "@/components/money/money";`, filename: uiFile, errors: 1 },
    { code: `import { x } from "@/features/goals/a/a";`, filename: uiFile, errors: 1 },
    { code: `import { x } from "@/features/goals/a/a";`, filename: sharedFile, errors: 1 },
    {
      code: `export { x } from "@/features/goals/a/a";`,
      filename: "/app/src/components/money/money.tsx",
      errors: 1,
    },
  ],
});

tester.run("no-comments", plugin.rules["no-comments"], {
  valid: [
    `const url = "https://example.com/a";`,
    `const text = "/* not a comment */";`,
    `/// <reference types="vite/client" />`,
  ],
  invalid: [
    { code: `const a = 1; // why`, errors: 1 },
    { code: `/* block */ const a = 1;`, errors: 1 },
    { code: `/** doc */\nexport function a() {}`, errors: 1 },
    { code: `// @ts-expect-error\nconst a: number = "";`, errors: 1 },
  ],
});
