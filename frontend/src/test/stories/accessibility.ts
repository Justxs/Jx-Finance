import axe from "axe-core";

export interface AccessibilityParameters {
  test?: "off" | "todo" | "error";
  config?: axe.Spec;
  options?: axe.RunOptions;
}

export const RULES_DISABLED_FOR_COMPONENTS = ["region"] as const;

export const RULES_DISABLED_IN_JSDOM = [
  "color-contrast",
  "color-contrast-enhanced",
  "link-in-text-block",
  "target-size",
  "scrollable-region-focusable",
] as const;

export const HIDDEN_AT_DESKTOP_WIDTH = [
  '[class~="sm:hidden"]',
  '[class~="md:hidden"]',
  '[class~="lg:hidden"]',
  '[class~="xl:hidden"]',
] as const;

function describeViolation(violation: axe.Result) {
  const nodes = violation.nodes.map((node) => `    ${node.target.join(" ")}\n    ${node.html}`);
  return `${violation.id} (${violation.impact}): ${violation.help}\n${nodes.join("\n")}`;
}

export async function expectNoAccessibilityViolations(parameters?: AccessibilityParameters) {
  if (parameters?.test === "off" || parameters?.test === "todo") {
    return;
  }
  axe.reset();
  axe.configure({
    ...parameters?.config,
    rules: [
      ...RULES_DISABLED_FOR_COMPONENTS.map((id) => ({ id, enabled: false })),
      ...(parameters?.config?.rules ?? []),
      ...RULES_DISABLED_IN_JSDOM.map((id) => ({ id, enabled: false })),
    ],
  });
  const { violations } = await axe.run(
    { include: document.body, exclude: [...HIDDEN_AT_DESKTOP_WIDTH] },
    parameters?.options ?? {},
  );
  if (violations.length > 0) {
    throw new Error(
      `Accessibility violations:\n${violations.map((violation) => describeViolation(violation)).join("\n")}`,
    );
  }
}
