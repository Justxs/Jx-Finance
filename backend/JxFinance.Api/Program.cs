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

var recoveryIndex = Array.IndexOf(args, "--recover-admin");
if (recoveryIndex >= 0)
{
    if (recoveryIndex + 1 >= args.Length) throw new ArgumentException("Provide the administrator email after --recover-admin.");
    await RecoveryCommand.RunAsync(app.Services, args[recoveryIndex + 1]);
    return;
}

var demoIndex = Array.IndexOf(args, "--seed-demo");
if (demoIndex >= 0)
{
    if (demoIndex + 1 >= args.Length) throw new ArgumentException("Provide the user email after --seed-demo.");
    await app.ApplyMigrationsAsync();
    await DemoDataCommand.RunAsync(app.Services, args[demoIndex + 1]);
    return;
}

app.UseApiPipeline();
await app.ExportOpenApiDocsAndExitAsync("v1");
await app.ApplyMigrationsAsync();

await app.RunAsync();

public partial class Program
{
    protected Program()
    {
    }
}
