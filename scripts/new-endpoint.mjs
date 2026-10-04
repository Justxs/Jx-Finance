import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fail, root, scaffold } from "./run.mjs";

const args = process.argv.slice(2);
const [tag, name, verbInput, route] = args.filter((arg) => !arg.startsWith("--"));
const option = (key) => {
  const arg = args.find((value) => value === `--${key}` || value.startsWith(`--${key}=`));
  return arg && (arg.split("=")[1] ?? true);
};
const verbs = { get: "Get", post: "Post", put: "Put", patch: "Patch", delete: "Delete" };
const verb = verbs[(verbInput ?? "").toLowerCase()];

if (!tag || !name || !verb || !route) {
  fail(
    'Usage: just new-endpoint <Tag> <Name> <get|post|put|patch|delete> "<route>" [--service[=IName]] [--collection=<Name>]\nExample: just new-endpoint Goals ArchiveGoal post "goals/{id}/archive" --service',
  );
}

const api = join(root, "backend", "JxFinance.Api");
const tagFolder = join(api, "Endpoints", tag);
const testFolder = join(root, "backend", "JxFinance.Tests", "Integration", tag);
const namespace = `JxFinance.Endpoints.${tag}.${name}`;

if (!existsSync(join(tagFolder, `${tag}Group.cs`))) {
  fail(`No ${tag}Group.cs in ${tagFolder}. Create the group first or pick an existing tag.`);
}

function read(file) {
  return readFileSync(file, "utf8");
}

function routeExpression() {
  const values = new Map();
  for (const [, key, expression] of read(join(api, "Common", "ApiRoutes.cs")).matchAll(/const string (\w+) = (.+);/g)) {
    values.set(key, expression.split("+").map((part) => part.trim()).map((part) => (part.startsWith('"') ? JSON.parse(part) : values.get(part))).join(""));
  }
  const [key, value] = [...values].filter(([, value]) => route === value || route.startsWith(`${value}/`)).sort((a, b) => b[1].length - a[1].length)[0] ?? [];
  if (!key) return JSON.stringify(route);
  return route === value ? `ApiRoutes.${key}` : `ApiRoutes.${key} + ${JSON.stringify(route.slice(value.length))}`;
}

function collection() {
  const known = [...read(join(root, "backend", "JxFinance.Tests", "Support", "Collections.cs")).matchAll(/class (\w+)Collection\b/g)].map((match) => match[1]);
  const named = option("collection");
  const found = existsSync(testFolder) && readdirSync(testFolder).map((file) => read(join(testFolder, file)).match(/\[Collection<(\w+)Collection>\]/)?.[1]).find(Boolean);
  const chosen = typeof named === "string" ? named : found;
  if (!known.includes(chosen)) fail(`Pass --collection=<Name> for the integration test, one of: ${known.join(", ")}.`);
  return chosen;
}

function service() {
  const flag = option("service");
  if (!flag) return null;
  const folder = join(tagFolder, "Interfaces");
  const interfaces = existsSync(folder) ? readdirSync(folder).map((file) => file.replace(/\.cs$/, "")) : [];
  const chosen = typeof flag === "string" ? flag : interfaces.length === 1 ? interfaces[0] : null;
  if (!interfaces.includes(chosen)) fail(`Pass --service=<IName>, one of: ${interfaces.join(", ")}.`);
  const implementation = readdirSync(join(tagFolder, "Services")).map((file) => join(tagFolder, "Services", file)).find((file) => read(file).includes(`RegisterService<${chosen}>`));
  if (!implementation) fail(`No class in ${tag}/Services registers ${chosen}.`);
  return { name: chosen, field: chosen.charAt(1).toLowerCase() + chosen.slice(2), file: join(tagFolder, "Interfaces", `${chosen}.cs`), implementation };
}

function withUsing(text, using) {
  if (text.includes(`using ${using};`)) return text;
  const lines = text.split("\n");
  const at = lines.findIndex((line) => line.startsWith("using ") && !line.startsWith("using System") && line > `using ${using};`);
  const last = lines.findLastIndex((line) => line.startsWith("using "));
  if (at >= 0 || last >= 0) lines.splice(at < 0 ? last + 1 : at, 0, `using ${using};`);
  else lines.unshift(`using ${using};`, "");
  return lines.join("\n");
}

function append(file, member, usings) {
  const text = usings.reduce(withUsing, read(file)).trimEnd();
  writeFileSync(file, `${text.slice(0, -1).trimEnd()}\n\n${member}\n}\n`);
}

const testFile = join(testFolder, `${name}Tests.cs`);
if (existsSync(testFile)) fail(`${testFile} already exists.`);
const testCollection = collection();
const target = service();
const routeCode = routeExpression();
const creates = verb === "Post" && name.startsWith("Create");
const injected = target ? `(${target.name} ${target.field})` : "";
const serviceUsing = target ? `using JxFinance.Endpoints.${tag}.Interfaces;\n` : "";

const deleteFiles = {
  [`${name}Endpoint.cs`]: `using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
${serviceUsing}
namespace ${namespace};

public sealed class ${name}Endpoint${injected} : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(${routeCode});
        Group<${tag}Group>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        ${target ? `${target.field}.${name}Async(id, ct)` : "Task.FromResult<Result<Guid>>(id)"};
}
`,
  [`${name}Summary.cs`]: `using FastEndpoints;

namespace ${namespace};

public sealed class ${name}Summary : Summary<${name}Endpoint>
{
    public ${name}Summary()
    {
        Summary = "${name}";
        Description = "Describe what this does and when to call it.";
        Params["id"] = "The id.";
        Responses[204] = "Deleted.";
        Responses[404] = "Not found.";
    }
}
`,
};

const description = creates ? `\n        Description(d => d.ProducesCreated<${name}Response>());` : "";
const result = target ? `await ${target.field}.${name}Async(req, ct)` : "result";
const send = creates ? `await Send.CreatedOrProblemAsync(${result}, created => created.Id, ct);` : `await Send.OkOrProblemAsync(${result}, ct);`;
const handler = target
  ? ` =>\n        ${send}`
  : `\n    {\n        Result<${name}Response> result = new ${name}Response(req.Id);\n        ${send}\n    }`;
const success = creates ? `Responses[201] = "Created. The Location header points at it.";` : `Responses[200] = "Succeeded.";`;

const requestFiles = {
  [`${name}Request.cs`]: `namespace ${namespace};

public sealed record ${name}Request(Guid Id);
`,
  [`${name}Response.cs`]: `namespace ${namespace};

public sealed record ${name}Response(Guid Id);
`,
  [`${name}Validator.cs`]: `using FastEndpoints;
using JxFinance.Common.Validation;

namespace ${namespace};

public sealed class ${name}Validator : Validator<${name}Request>
{
    public ${name}Validator()
    {
        RuleFor(r => r.Id).IsRequired();
    }
}
`,
  [`${name}Endpoint.cs`]: `using FastEndpoints;
using JxFinance.Common;
${target ? "" : "using JxFinance.Domain.Common;\n"}${serviceUsing}
namespace ${namespace};

public sealed class ${name}Endpoint${injected} : Endpoint<${name}Request, ${name}Response>
{
    public override void Configure()
    {
        ${verb}(${routeCode});
        Group<${tag}Group>();${description}
    }

    public override async Task HandleAsync(${name}Request req, CancellationToken ct)${handler}
}
`,
  [`${name}Summary.cs`]: `using FastEndpoints;

namespace ${namespace};

public sealed class ${name}Summary : Summary<${name}Endpoint, ${name}Request>
{
    public ${name}Summary()
    {
        Summary = "${name}";
        Description = "Describe what this does and when to call it.";
        ${success}
        Responses[400] = "Validation failed.";
    }
}
`,
};

scaffold(join(tagFolder, name), verb === "Delete" ? deleteFiles : requestFiles);

if (target) {
  const signature = verb === "Delete" ? `Task<Result<Guid>> ${name}Async(Guid id, CancellationToken cancellationToken)` : `Task<Result<${name}Response>> ${name}Async(${name}Request request, CancellationToken cancellationToken)`;
  const body = verb === "Delete" ? "Task.FromResult<Result<Guid>>(id)" : `Task.FromResult<Result<${name}Response>>(new ${name}Response(request.Id))`;
  const usings = verb === "Delete" ? ["JxFinance.Domain.Common"] : ["JxFinance.Domain.Common", namespace];
  append(target.file, `    ${signature};`, usings);
  append(target.implementation, `    public ${signature} =>\n        ${body};`, usings);
  console.log(`Added ${name}Async to ${target.name} and its implementation.`);
}

const url = `/api/${route.replace(/\{\w+(:\w+)?\}/g, "{id}")}${verb === "Get" && !route.includes("{") ? "?id={id}" : ""}`;
const call = { Get: "GetAsync(url, ct)", Delete: "DeleteAsync(url, ct)" }[verb] ?? `${verb}AsJsonAsync(url, new { id }, ct)`;
const status = verb === "Delete" ? "NoContent" : creates ? "Created" : "OK";
mkdirSync(testFolder, { recursive: true });
writeFileSync(
  testFile,
  `using System.Net;
${["Get", "Delete"].includes(verb) ? "" : "using System.Net.Http.Json;\n"}using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.${tag};

[Collection<${testCollection}Collection>]
public sealed class ${name}Tests(${testCollection}Fixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task ${name}_answers_${status}()
    {
        var ct = TestContext.Current.CancellationToken;
        var id = Guid.NewGuid();
        var url = $"${url}";

        var response = await Client.${call};

        Assert.Equal(HttpStatusCode.${status}, response.StatusCode);
    }
}
`,
);
console.log(`Created ${name}Tests.cs in backend/JxFinance.Tests/Integration/${tag} (${testCollection} collection).`);
console.log("Next: put the behaviour in the service, write the summary and a real test, then run 'just gen'");
console.log("and follow docs/adding-a-feature.md for the frontend half.");
