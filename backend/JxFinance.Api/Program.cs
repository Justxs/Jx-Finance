using FastEndpoints.OpenApi;
using JxFinance.Common;
using JxFinance.Extensions;
using JxFinance.Infrastructure;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

builder.AddApiServices();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

if (EmailAfter("--recover-admin", "administrator") is { } adminEmail)
{
    await RecoveryCommand.RunAsync(app.Services, adminEmail);
    return;
}

if (EmailAfter("--seed-demo", "user") is { } demoEmail)
{
    await app.ApplyMigrationsAsync();
    await DemoDataCommand.RunAsync(app.Services, demoEmail);
    return;
}

app.UseApiPipeline();
await app.ExportOpenApiDocsAndExitAsync(OpenApiExtensions.DocumentName);
await app.ApplyMigrationsAsync();

await app.RunAsync();

string? EmailAfter(string flag, string whose)
{
    var index = Array.IndexOf(args, flag);
    if (index < 0)
    {
        return null;
    }

    return index + 1 < args.Length ? args[index + 1] : throw new ArgumentException($"Provide the {whose} email after {flag}.");
}

public partial class Program
{
    protected Program()
    {
    }
}
