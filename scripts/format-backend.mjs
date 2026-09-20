import { fail, run } from "./run.mjs";

const flags = process.argv.slice(2).map((flag) => (flag === "--check" ? "--verify-no-changes" : flag));

try {
  run("dotnet", ["format", "backend/JxFinance.slnx", ...flags, "--exclude", "backend/JxFinance.Api/Infrastructure/Data/Migrations"]);
} catch (error) {
  fail(error.message);
}
