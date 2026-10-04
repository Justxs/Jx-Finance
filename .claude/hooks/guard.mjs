import { readFileSync } from "node:fs";

const WRITE_CMDLET = /(^|[;|&{(\n])\s*(Set-Content|Add-Content|Out-File)\b/im;
const NUB_COMMAND = /(^|[;|&(\n])\s*(cd [^;&|]+(;|&&)\s*)?nub(\s|$)/m;
const GENERATED = [
  [/\/frontend\/openapi\.json$/, "just gen"],
  [/\/frontend\/src\/api\/(generated|schemas)\//, "just gen"],
  [/\/docs\/api-routes\.md$/, "just gen"],
  [/\/frontend\/src\/route-tree\.gen\.ts$/, "the TanStack Router plugin, which rewrites it when a file under src/routes changes"],
  [/\/backend\/JxFinance\.Api\/Infrastructure\/Data\/Migrations\//, "just migrate-add <Name> after changing the model, or just migrate-remove"],
];

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }),
  );
}

const input = JSON.parse(readFileSync(0, "utf8"));
const command = String(input.tool_input?.command ?? "");
const filePath = `/${String(input.tool_input?.file_path ?? "").replaceAll("\\", "/")}`;
const generator = GENERATED.find(([pattern]) => pattern.test(filePath));

if (generator) {
  deny(`${input.tool_input.file_path} is generated and never edited by hand. Change its source and regenerate it with ${generator[1]}.`);
} else if (input.tool_name === "Bash" && NUB_COMMAND.test(command)) {
  deny("nub fails in Git Bash in this repo. Run the same nub command through the PowerShell tool.");
} else if (WRITE_CMDLET.test(command)) {
  deny(
    "Set-Content, Add-Content and Out-File write a BOM or CRLF, and files here are UTF-8 with LF. Use the Write or Edit tool, or a node script, to write the file.",
  );
}
