using System.Text.Json;
using System.Text.Json.Serialization;
using FastEndpoints;
using FastEndpoints.Swagger;
using JxFinance.Endpoints.Accounts;
using JxFinance.Endpoints.Categories;
using JxFinance.Endpoints.Dashboard;
using JxFinance.Endpoints.Ping;
using JxFinance.Endpoints.Transactions;
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
        builder.Services.ConfigureHttpJsonOptions(options =>
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
        builder.Services.AddFastEndpoints();
        builder.Services.SwaggerDocument(options =>
        {
            options.ShortSchemaNames = true;
            options.EnableJWTBearerAuth = false;
            options.SerializerSettings = settings =>
            {
                settings.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
            };
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
        builder.Services.AddScoped<IAccountService, AccountService>();
        builder.Services.AddScoped<ICategoryService, CategoryService>();
        builder.Services.AddScoped<ITransactionService, TransactionService>();
        builder.Services.AddScoped<IDashboardService, DashboardService>();

        return builder;
    }
}
