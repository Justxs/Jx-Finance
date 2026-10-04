import { readFileSync } from "node:fs";

const WRITE_CMDLET = /(^|[;|&{(\n])\s*(Set-Content|Add-Content|Out-File)\b/im;
const NUB_COMMAND = /(^|[;|&(\n])\s*(cd [^;&|]+(;|&&)\s*)?nub(\s|$)/m;

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

if (input.tool_name === "Bash" && NUB_COMMAND.test(command)) {
  deny("nub fails in Git Bash in this repo. Run the same nub command through the PowerShell tool.");
} else if (WRITE_CMDLET.test(command)) {
  deny(
    "Set-Content, Add-Content and Out-File write a BOM or CRLF, and files here are UTF-8 with LF. Use the Write or Edit tool, or a node script, to write the file.",
  );
}
