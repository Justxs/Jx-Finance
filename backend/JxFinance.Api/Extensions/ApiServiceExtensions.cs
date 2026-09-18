using System.Text.Json;
using System.Text.Json.Serialization;
using FastEndpoints;
using JxFinance.Api;
using JxFinance.Common.ExchangeRates;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.ExchangeRates;
using Microsoft.AspNetCore.Identity;
using Microsoft.OpenApi;
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
        builder.Services.AddFastEndpoints(DiscoveredTypes.All);
        builder.Services.RegisterServicesFromJxFinanceApi();
        builder.Services.AddApiOpenApiDocument();

        var connectionString = builder.Configuration.GetConnectionString("Default");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Connection string 'Default' is not configured.");
        }

        builder.Services.AddHealthChecks()
            .AddNpgSql(connectionString);

        var rateOptions = builder.Configuration.GetSection($"{AppOptions.SectionName}:ExchangeRates").Get<ExchangeRateOptions>() ?? new ExchangeRateOptions();
        builder.Services.AddHttpClient<IExchangeRateProvider, FrankfurterRateProvider>(client =>
        {
            client.BaseAddress = new Uri(rateOptions.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(10);
        });

        if (!builder.Configuration.GetValue<bool>("export-openapi-docs") && builder.Configuration.GetValue("App:BackgroundJobs", true))
        {
            builder.Services.AddHostedService<RecurringBillReminderJob>();
            builder.Services.AddHostedService<NetWorthSnapshotJob>();
            builder.Services.AddHostedService<ExchangeRateSyncJob>();
        }

        return builder;
    }
}
