import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { composite, contrastRatio, parseHex, type Rgb } from "@/test/contrast";

const TEXT = 4.5;
const NON_TEXT = 3;

type Theme = "light" | "dark";
type Tokens = Record<string, string>;

interface ContrastCase {
  palette: string;
  theme: Theme;
  pair: string;
  ratio: number;
  required: number;
}

const css = readFileSync("src/global.css", "utf8").replaceAll("\r", "");

function opacityOf(path: string, className: string) {
  const match = new RegExp(String.raw`(?<![\w:-])${className}/(\d+)\b`).exec(
    readFileSync(path, "utf8"),
  );
  if (!match?.[1]) {
    throw new Error(`${path} no longer uses ${className}/<opacity>`);
  }
  return Number(match[1]) / 100;
}

function ringOpacity() {
  const inUtility = /ring-ring\/(\d+)\b/.exec(css)?.[1];
  if (inUtility) {
    return Number(inUtility) / 100;
  }
  return opacityOf("src/components/ui/input/input.tsx", "focus-visible:ring-ring");
}

const opacity = {
  panelLight: opacityOf("src/components/ui/section/section.tsx", "bg-muted"),
  inputFillLight: opacityOf("src/components/ui/input/input.tsx", "bg-muted"),
  inputFillDark: opacityOf("src/components/ui/input/input.tsx", "dark:bg-input"),
  primaryHover: opacityOf("src/components/ui/button/button.tsx", "hover:bg-primary"),
  destructiveHover: opacityOf("src/components/ui/button/button.tsx", "hover:bg-destructive"),
  ring: ringOpacity(),
};

function rules() {
  const blocks = new Map<string, Tokens>();
  for (const [, selectorText = "", body = ""] of css.matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
    const tokens = Object.fromEntries(
      [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name = "", value = ""]) => [
        name,
        value.trim(),
      ]),
    );
    for (const selector of selectorText.split(",")) {
      blocks.set(selector.trim().replaceAll(/\s+/g, " "), tokens);
    }
  }
  return blocks;
}

const blocks = rules();

function block(selector: string) {
  const tokens = blocks.get(selector);
  if (!tokens) {
    throw new Error(`global.css has no rule for ${selector}`);
  }
  return tokens;
}

const palettes = [...blocks.keys()].flatMap(
  (selector) => /^\[data-palette="([\w-]+)"\]$/.exec(selector)?.[1] ?? [],
);

function tokensFor(palette: string, theme: Theme): Tokens {
  const light = { ...block('[data-palette="ledger"]'), ...block(`[data-palette="${palette}"]`) };
  if (theme === "light") {
    return light;
  }
  return {
    ...light,
    ...block('.dark [data-palette="ledger"]'),
    ...block(`.dark [data-palette="${palette}"]`),
  };
}

function casesFor(palette: string, theme: Theme): ContrastCase[] {
  const tokens = tokensFor(palette, theme);
  function color(name: string) {
    const value = tokens[name];
    if (value === undefined) {
      throw new Error(`${palette} ${theme} has no --${name}`);
    }
    return parseHex(value, `--${name} in ${palette} ${theme}`);
  }

  const dark = theme === "dark";
  const background = color("background");
  const panel = dark ? color("card") : composite(color("muted"), opacity.panelLight, background);
  const inputFill = dark
    ? composite(color("input"), opacity.inputFillDark, panel)
    : composite(color("muted"), opacity.inputFillLight, panel);
  const outer = {
    background,
    sidebar: color("sidebar"),
    card: color("card"),
    popover: color("popover"),
    panel,
  };
  const surfaces = {
    ...outer,
    muted: color("muted"),
    "input fill": inputFill,
    accent: color("accent"),
  };

  const cases: ContrastCase[] = [];
  function check(pair: string, foreground: Rgb, surface: Rgb, required: number) {
    cases.push({ palette, theme, pair, ratio: contrastRatio(foreground, surface), required });
  }

  for (const text of ["foreground", "muted-foreground", "income", "expense", "primary"]) {
    for (const [name, surface] of Object.entries(surfaces)) {
      check(`${text} on ${name}`, color(text), surface, TEXT);
    }
  }
  check("primary-foreground on primary", color("primary-foreground"), color("primary"), TEXT);
  check(
    "primary-foreground on primary hover",
    color("primary-foreground"),
    composite(color("primary"), opacity.primaryHover, background),
    TEXT,
  );
  check(
    "destructive-foreground on destructive",
    color("destructive-foreground"),
    color("destructive"),
    TEXT,
  );
  check(
    "destructive-foreground on destructive hover",
    color("destructive-foreground"),
    composite(color("destructive"), opacity.destructiveHover, background),
    TEXT,
  );
  check("accent-foreground on accent", color("accent-foreground"), color("accent"), TEXT);
  check(
    "secondary-foreground on secondary",
    color("secondary-foreground"),
    color("secondary"),
    TEXT,
  );

  for (const [name, surface] of Object.entries(surfaces)) {
    check(
      `focus ring on ${name}`,
      composite(color("ring"), opacity.ring, surface),
      surface,
      NON_TEXT,
    );
  }
  for (const [name, surface] of Object.entries(outer)) {
    check(`input stroke on ${name}`, color("input"), surface, NON_TEXT);
  }
  const chartSurfaces = { background, card: color("card"), panel };
  for (const chart of ["chart-1", "chart-2", "chart-3"]) {
    for (const [name, surface] of Object.entries(chartSurfaces)) {
      check(`${chart} on ${name}`, color(chart), surface, NON_TEXT);
    }
  }
  return cases;
}

const cases = palettes.flatMap((palette) =>
  (["light", "dark"] as const).flatMap((theme) => casesFor(palette, theme)),
);

it("finds every palette in global.css", () => {
  expect(palettes).toEqual(expect.arrayContaining(["ledger", "plum", "sepia", "graphite"]));
});

it.each(cases)(
  "$palette $theme: $pair reaches $required:1",
  ({ palette, theme, pair, ratio, required }) => {
    expect(
      ratio,
      `${palette} ${theme}: ${pair} is ${ratio.toFixed(2)}:1, needs ${required}:1`,
    ).toBeGreaterThanOrEqual(required);
  },
);
