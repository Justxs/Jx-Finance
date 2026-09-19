import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [tag, name, verbInput, route] = process.argv.slice(2);
const verbs = { get: "Get", post: "Post", put: "Put", patch: "Patch", delete: "Delete" };
const verb = verbs[(verbInput ?? "").toLowerCase()];

if (!tag || !name || !verb || !route) {
  console.error('Usage: just new-endpoint <Tag> <Name> <get|post|put|patch|delete> "<route>"');
  console.error('Example: just new-endpoint Goals ArchiveGoal post "goals/{id}/archive"');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tagFolder = join(root, "backend", "JxFinance.Api", "Endpoints", tag);
const folder = join(tagFolder, name);
const namespace = `JxFinance.Endpoints.${tag}.${name}`;

if (!existsSync(join(tagFolder, `${tag}Group.cs`))) {
  console.error(`No ${tag}Group.cs in ${tagFolder}. Create the group first or pick an existing tag.`);
  process.exit(1);
}
if (existsSync(folder)) {
  console.error(`${folder} already exists.`);
  process.exit(1);
}

const files = {
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

namespace ${namespace};

public sealed class ${name}Endpoint : Endpoint<${name}Request, ${name}Response>
{
    public override void Configure()
    {
        ${verb}("${route}");
        Group<${tag}Group>();
    }

    public override async Task HandleAsync(${name}Request req, CancellationToken ct)
    {
        await Send.OkAsync(new ${name}Response(req.Id), ct);
    }
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
        Responses[200] = "Succeeded.";
        Responses[400] = "Validation failed.";
    }
}
`,
};

mkdirSync(folder, { recursive: true });
for (const [file, content] of Object.entries(files)) {
  writeFileSync(join(folder, file), content);
}

console.log(`Created ${Object.keys(files).length} files in backend/JxFinance.Api/Endpoints/${tag}/${name}.`);
console.log("Next: implement the handler through the tag's service, write the summary, add an integration test,");
console.log("then run 'just gen' and follow docs/13. Adding a feature.md for the frontend half.");
