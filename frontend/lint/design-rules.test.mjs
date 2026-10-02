import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";
import plugin from "./design-rules.mjs";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: { sourceType: "module", parserOptions: { lang: "tsx" } },
});

function rule(name) {
  return plugin.rules[name];
}

tester.run("no-rounded-full", rule("no-rounded-full"), {
  valid: [
    `<div className="rounded-lg" />`,
    `const tag = "rounded-sm text-xs";`,
    `const words = "a full rounded answer";`,
  ],
  invalid: [
    { code: `<div className="size-2 rounded-full" />`, errors: 1 },
    { code: `cn("flex", open && "hover:rounded-full")`, errors: 1 },
    { code: `const c = \`rounded-t-full \${x}\`;`, errors: 1 },
    { code: `cva("base", { variants: { size: { dot: "!rounded-full" } } })`, errors: 1 },
  ],
});

tester.run("no-transition-all", rule("no-transition-all"), {
  valid: [`<div className="transition-colors duration-base" />`, `const c = "transition-reveal";`],
  invalid: [
    { code: `<div className="transition-all duration-base" />`, errors: 1 },
    { code: `cn("md:transition-all")`, errors: 1 },
  ],
});

tester.run("no-destructive-text", rule("no-destructive-text"), {
  valid: [
    `<p className="text-expense" />`,
    `<span className="bg-destructive text-destructive-foreground" />`,
    `<div className="aria-invalid:border-destructive" />`,
  ],
  invalid: [
    { code: `<p className="text-xs text-destructive" />`, errors: 1 },
    { code: `cn("hover:text-destructive/80")`, errors: 1 },
  ],
});

tester.run("no-text-ghost-button", rule("no-text-ghost-button"), {
  valid: [
    `<Button variant="ghost" size="icon" aria-label="Close"><X /></Button>`,
    `<Button variant="outline">Save</Button>`,
    `<Button variant="ghost">{icon}</Button>`,
  ],
  invalid: [
    { code: `<Button variant="ghost">Save</Button>`, errors: 1 },
    { code: `<Button variant="ghost" size="sm">{t("actions.save")}</Button>`, errors: 1 },
    { code: `<Button variant={"ghost"}><Plus />{"Add"}</Button>`, errors: 1 },
  ],
});

tester.run("no-native-title", rule("no-native-title"), {
  valid: [
    `<span className="truncate" title={name}>{name}</span>`,
    `<Section title="Accounts" />`,
    `<Tooltip content={name}><button type="button">{name}</button></Tooltip>`,
  ],
  invalid: [
    { code: `<button type="button" title={name}>{name}</button>`, errors: 1 },
    { code: `<a href="/x" title="Open">Open</a>`, errors: 1 },
    { code: `<span role="button" title="Open">Open</span>`, errors: 1 },
    { code: `<div onClick={open} title="Open" />`, errors: 1 },
  ],
});

tester.run("no-literal-number-placeholder", rule("no-literal-number-placeholder"), {
  valid: [
    `<input placeholder="0" />`,
    `<input placeholder={zero} />`,
    `<input placeholder="Search" />`,
    `<input placeholder="LT12 3456" />`,
  ],
  invalid: [
    { code: `<input placeholder="0.00" />`, errors: 1 },
    { code: `<Field placeholder={"1,0000"} />`, errors: 1 },
    { code: `<input placeholder="1 000" />`, errors: 1 },
  ],
});
