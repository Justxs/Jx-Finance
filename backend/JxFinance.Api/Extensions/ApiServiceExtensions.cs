using FastEndpoints;
using FastEndpoints.Swagger;
using JxFinance.Endpoints.Ping;
using Serilog;

namespace JxFinance.Extensions;

public static class ApiServiceExtensions
{
    public static WebApplicationBuilder AddApiServices(this WebApplicationBuilder builder)
    {
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(builder.Configuration)
            .CreateLogger();

        builder.Host.UseSerilog();

        builder.Services.AddProblemDetails();
        builder.Services.AddFastEndpoints();
        builder.Services.SwaggerDocument(options =>
        {
            options.ShortSchemaNames = true;
            options.EnableJWTBearerAuth = false;
            options.DocumentSettings = settings =>
            {
                settings.DocumentName = "v1";
                settings.Title = "Jx Finance API";
                settings.Version = "v1";
            };
        });

        var connectionString = builder.Configuration.GetConnectionString("Default");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Connection string 'Default' is not configured.");
        }

        builder.Services.AddHealthChecks()
            .AddNpgSql(connectionString);

        builder.Services.AddScoped<IPingService, PingService>();

        return builder;
    }
}
