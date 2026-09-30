using FastEndpoints;
using JxFinance.Api;
using JxFinance.Common.Discord;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Middleware;
using JxFinance.Common.Receipts;
using JxFinance.Endpoints.Backups.UploadBackup;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Infrastructure.Brokers.InteractiveBrokers;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Discord;
using JxFinance.Infrastructure.ExchangeRates;
using JxFinance.Infrastructure.MarketPrices;
using JxFinance.Infrastructure.Receipts;
using Serilog;

namespace JxFinance.Extensions;

public static class ApiServiceExtensions
{
    public static WebApplicationBuilder AddApiServices(this WebApplicationBuilder builder)
    {
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(builder.Configuration)
            .WriteToTelemetry(builder.Configuration)
            .CreateLogger();

        builder.Host.UseSerilog();
        builder.AddTelemetry();

        builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(
            form => form.MultipartBodyLengthLimit = UploadBackupEndpoint.MaxFileBytes + (1024 * 1024));
        builder.Services.AddFastEndpoints(DiscoveredTypes.All);
        builder.Services.RegisterServicesFromJxFinanceApi();
        builder.Services.AddApiOpenApiDocument();
        builder.Services.AddRateLimiter(PersonalApiTokenRateLimit.Configure);

        builder.Services.AddHealthChecks()
            .AddNpgSql(builder.Configuration.DefaultConnectionString());

        var rateOptions = builder.Configuration.GetSection($"{AppOptions.SectionName}:ExchangeRates").Get<ExchangeRateOptions>() ?? new ExchangeRateOptions();
        builder.Services.AddHttpClient<IExchangeRateProvider, FrankfurterRateProvider>(client =>
        {
            client.BaseAddress = new Uri(rateOptions.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(10);
        });

        var flexUrl = builder.Configuration[$"{AppOptions.SectionName}:{nameof(AppOptions.InteractiveBrokersFlexUrl)}"]
            ?? new AppOptions().InteractiveBrokersFlexUrl;
        builder.Services.AddHttpClient<IFlexClient, FlexClient>(client =>
        {
            client.BaseAddress = new Uri(flexUrl);
            client.Timeout = TimeSpan.FromSeconds(30);
            client.MaxResponseContentBufferSize = 50 * 1024 * 1024;
            client.DefaultRequestHeaders.UserAgent.ParseAdd("JxFinance/1.0");
        }).RemoveAllLoggers();

        var priceOptions = builder.Configuration.GetSection($"{AppOptions.SectionName}:MarketPrices").Get<MarketPriceOptions>() ?? new MarketPriceOptions();
        builder.Services.AddSingleton<EodhdQuoteCurrencies>();
        builder.Services.AddHttpClient<EodhdPriceProvider>(client => ConfigurePriceClient(client, priceOptions.EodhdBaseUrl)).RemoveAllLoggers();
        builder.Services.AddHttpClient<KrakenPriceProvider>(client => ConfigurePriceClient(client, priceOptions.KrakenBaseUrl)).RemoveAllLoggers();
        builder.Services.AddTransient<IMarketPriceProvider>(sp => sp.GetRequiredService<EodhdPriceProvider>());
        builder.Services.AddTransient<IMarketPriceProvider>(sp => sp.GetRequiredService<KrakenPriceProvider>());

        builder.Services.AddHttpClient<IDiscordWebhookClient, DiscordWebhookClient>(client =>
        {
            client.BaseAddress = new Uri(DiscordWebhookClient.BaseAddress);
            client.Timeout = TimeSpan.FromSeconds(10);
            client.MaxResponseContentBufferSize = 64 * 1024;
            client.DefaultRequestHeaders.UserAgent.ParseAdd("JxFinance/1.0");
        }).RemoveAllLoggers();

        builder.Services.AddSingleton<IReceiptReader, TesseractReceiptReader>();

        if (!builder.Configuration.GetValue<bool>("export-openapi-docs") && builder.Configuration.GetValue(ConfigKeys.BackgroundJobs, true))
        {
            builder.Services.AddHostedService<RecurringBillReminderJob>();
            builder.Services.AddHostedService<BudgetAlertJob>();
            builder.Services.AddHostedService<LowBalanceJob>();
            builder.Services.AddHostedService<WarrantyReminderJob>();
            builder.Services.AddHostedService<NetWorthSnapshotJob>();
            builder.Services.AddHostedService<ExchangeRateSyncJob>();
            builder.Services.AddHostedService<BrokerSyncJob>();
            builder.Services.AddHostedService<PriceSyncJob>();
            builder.Services.AddHostedService<EmailOutboxJob>();
            builder.Services.AddHostedService<DiscordOutboxJob>();
            builder.Services.AddHostedService<UnusualAmountJob>();
            builder.Services.AddHostedService<MonthCloseReminderJob>();
            builder.Services.AddHostedService<MonthlyDigestJob>();
            builder.Services.AddHostedService<RetentionJob>();
        }

        return builder;
    }

    private static void ConfigurePriceClient(HttpClient client, string baseUrl)
    {
        client.BaseAddress = new Uri(baseUrl);
        client.Timeout = TimeSpan.FromSeconds(20);
        client.MaxResponseContentBufferSize = 5 * 1024 * 1024;
        client.DefaultRequestHeaders.UserAgent.ParseAdd("JxFinance/1.0");
    }
}
