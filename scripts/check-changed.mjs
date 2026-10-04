import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fail, root, run } from "./run.mjs";

function lines(args) {
  return run("git", args, { capture: true }).stdout.split(/\r?\n/).filter(Boolean);
}

const changed = [...new Set([...lines(["diff", "--name-only", "HEAD"]), ...lines(["ls-files", "--others", "--exclude-standard"])])].filter(
  (file) => existsSync(path.join(root, file)),
);
const frontend = changed.filter((file) => file.startsWith("frontend/")).map((file) => file.slice("frontend/".length));
const lintable = frontend.filter((file) => /\.(?:ts|tsx|mjs)$/.test(file));
const formattable = frontend.filter((file) => /\.(?:ts|tsx|js|cjs|mjs|json|jsonc|css|md)$/.test(file));
const contractTests = [
  ["src/locales/", ["src/locales/locales.test.ts", "src/lib/server-error-codes.test.ts"]],
  ["src/api/", ["src/api/invalidation.test.ts", "src/storybook/fixtures.contract.test.ts"]],
  ["src/storybook/", ["src/storybook/fixtures.contract.test.ts"]],
];

function testsBeside(file) {
  const folder = path.posix.dirname(file);
  return readdirSync(path.join(root, "frontend", folder))
    .filter((name) => /\.test\.(?:ts|tsx|mjs)$/.test(name))
    .map((name) => `${folder}/${name}`);
}

const ownTests = [
  ...new Set([
    ...frontend.filter((file) => /^(?:src|lint)\/.+\.(?:ts|tsx|mjs)$/.test(file)).flatMap(testsBeside),
    ...contractTests.filter(([prefix]) => frontend.some((file) => file.startsWith(prefix))).flatMap(([, tests]) => tests),
  ]),
];

const steps = [];
if (lintable.length > 0) steps.push(["nub", ["exec", "--cwd", "frontend", "oxlint", "--no-error-on-unmatched-pattern", ...lintable]]);
if (formattable.length > 0) steps.push(["nub", ["exec", "--cwd", "frontend", "oxfmt", "--check", "--no-error-on-unmatched-pattern", ...formattable]]);
if (frontend.length > 0) steps.push(["nub", ["exec", "--cwd", "frontend", "tsc", "-b"]]);
if (ownTests.length > 0) steps.push(["nub", ["exec", "--cwd", "frontend", "vitest", "run", "--project", "unit", "--project", "dom", ...ownTests]]);
if (changed.some((file) => file.startsWith("backend/"))) {
  steps.push(["node", ["scripts/format-backend.mjs", "--check"]], ["just", ["test-unit"]]);
}
if (changed.some((file) => file.endsWith(".md"))) steps.push(["node", ["scripts/check-docs.mjs"]]);

if (steps.length === 0) console.log("No frontend, backend or docs changes against HEAD.");
const failed = steps.filter(([command, args]) => {
  console.log(`> ${command} ${args.join(" ")}`);
  return run(command, args, { allowFailure: true }).status !== 0;
});
if (failed.length > 0) fail(`Failed: ${failed.map(([command, args]) => `${command} ${args.slice(0, 4).join(" ")}`).join("; ")}`);
