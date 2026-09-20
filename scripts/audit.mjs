import { fail, run } from "./run.mjs";

const selected = ["--backend", "--frontend"].filter((flag) => process.argv.includes(flag));
const backend = selected.length === 0 || selected.includes("--backend");
const frontend = selected.length === 0 || selected.includes("--frontend");

try {
  if (backend) {
    const report = run("dotnet", ["list", "backend/JxFinance.slnx", "package", "--vulnerable", "--include-transitive"], { capture: true, allowFailure: true });
    console.log(report.stdout);
    if (report.status !== 0 || report.stdout.includes("has the following vulnerable packages")) {
      fail("A NuGet package with a known vulnerability is referenced. Update it in backend/Directory.Packages.props.");
    }
  }
  if (frontend) {
    run("nub", ["audit", "-C", "frontend", "--prod", "--audit-level", "moderate"]);
    run("nub", ["audit", "-C", "frontend", "--dev", "--audit-level", "moderate"], { allowFailure: true });
  }
} catch (error) {
  fail(error.message);
}
