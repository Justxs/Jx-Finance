using FastEndpoints;
using FastEndpoints.Swagger;
using JxFinance.Api.Common;
using JxFinance.Api.Features.Ping;
using JxFinance.Infrastructure;
using Scalar.AspNetCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
	.ReadFrom.Configuration(builder.Configuration)
	.CreateLogger();

builder.Host.UseSerilog();

builder.Services.AddProblemDetails();
builder.Services.AddFastEndpoints();
builder.Services.SwaggerDocument(options =>
{
	options.DocumentSettings = settings =>
	{
		settings.Title = "Just Finance API";
		settings.Version = "v1";
	};
});

// Feature services (vertical slices) — injected into endpoints and background jobs.
builder.Services.AddScoped<IPingService, PingService>();

var connectionString = builder.Configuration.GetConnectionString("Default");
if (string.IsNullOrWhiteSpace(connectionString))
{
	throw new InvalidOperationException("Connection string 'Default' is not configured.");
}

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHealthChecks()
	.AddNpgSql(connectionString);

var app = builder.Build();

app.UseExceptionHandler();
app.UseSerilogRequestLogging();

app.UseFastEndpoints();
app.UseSwaggerGen();

app.MapScalarApiReference(options =>
{
	options.WithTitle("Just Finance API")
		.WithOpenApiRoutePattern("/swagger/{documentName}/swagger.json");
});

app.MapHealthChecks("/health");

// Send the bare root to the API docs instead of a 404.
app.MapGet("/", () => Results.Redirect("/scalar/v1"));

app.ApplyMigrations();

app.Run();

// Exposed so the integration test project can boot the API via WebApplicationFactory.
public partial class Program;
