using FastEndpoints.Swagger;
using JxFinance.Common;
using JxFinance.Extensions;
using JxFinance.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.AddApiServices();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

app.UseApiPipeline();
await app.ExportSwaggerDocsAndExitAsync("v1");
await app.ApplyMigrationsAsync();

app.Run();

public partial class Program;
