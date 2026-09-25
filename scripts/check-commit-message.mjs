import { readFileSync } from "node:fs";
import { fail } from "./run.mjs";

const types = [
  "feat",
  "fix",
  "refactor",
  "perf",
  "test",
  "docs",
  "build",
  "ci",
  "chore",
  "style",
  "revert",
];
const subject = (readFileSync(process.argv[2], "utf8").split(/\r?\n/)[0] ?? "").trim();
const conventional = new RegExp(String.raw`^(${types.join("|")})(\([a-z0-9-]+\))?!?: \S.*$`);

if (/^(Merge|Revert|fixup!|squash!)/.test(subject) || conventional.test(subject)) {
  process.exit(0);
}

fail(
  [
    `Commit subject "${subject}" is not a conventional commit.`,
    `Use <type>(optional-scope): summary, with a type from: ${types.join(", ")}.`,
    "Example: feat(goals): archive a finished goal",
  ].join("\n"),
);
