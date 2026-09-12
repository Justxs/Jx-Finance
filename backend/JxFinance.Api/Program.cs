using FastEndpoints.OpenApi;
using JxFinance.Common;
using JxFinance.Extensions;
using JxFinance.Infrastructure;
using JxFinance.Infrastructure.Auth;

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
