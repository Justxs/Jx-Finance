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
