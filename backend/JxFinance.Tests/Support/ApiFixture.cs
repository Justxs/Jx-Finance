using System.Net.Http.Json;
using FastEndpoints.Testing;
using JxFinance.Common.Discord;
using JxFinance.Common.Email;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Receipts;
using JxFinance.Common.Telegram;
using JxFinance.Domain.Investments;
using JxFinance.Infrastructure.Brokers.InteractiveBrokers;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.MarketPrices;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace JxFinance.Tests.Support;

public abstract class ApiFixture : AppFixture<Program>
{
    public const string TestAdminEmail = "test-admin@localhost";
    public const string TestAdminPassword = "Test-Password-123!";
    public const long BackupMaxDecompressedBytes = 32L * 1024 * 1024;
    public const int PdfExportMaxRows = 5;
    public const string SiteUrl = "https://finance.test";
    public const string JwtSigningKey = "jx-finance-integration-tests-share-one-signing-key-across-every-app";

    private readonly string _keyDirectory = Path.Combine(Path.GetTempPath(), "jx-test-keys", Guid.NewGuid().ToString("N"));

    public HttpClient Api { get; private set; } = default!;

    public string AttachmentDirectory => Path.Combine(_keyDirectory, "attachments");

    public string ConnectionString { get; private set; } = default!;

    protected override async ValueTask PreSetupAsync() =>
        ConnectionString = await TestDatabases.CreateAsync(GetType().Name);

    protected override void ConfigureApp(IWebHostBuilder builder)
    {
        builder.UseSetting(ConfigKeys.DefaultConnectionSetting, ConnectionString);
        builder.UseSetting(ConfigKeys.BackgroundJobs, "false");
        builder.UseSetting(ConfigKeys.DataProtectionDirectory, _keyDirectory);
        builder.UseSetting(ConfigKeys.JwtSigningKey, JwtSigningKey);
        builder.UseSetting(ConfigKeys.BackupDirectory, Path.Combine(_keyDirectory, "backups"));
        builder.UseSetting(ConfigKeys.AttachmentDirectory, AttachmentDirectory);
        builder.UseSetting("App:BackupMaxDecompressedBytes", BackupMaxDecompressedBytes.ToString(System.Globalization.CultureInfo.InvariantCulture));
        builder.UseSetting("App:BackupLockTimeoutSeconds", "2");
        builder.UseSetting("App:RevalueBatchSize", "3");
        builder.UseSetting("App:PdfExportMaxRows", PdfExportMaxRows.ToString(System.Globalization.CultureInfo.InvariantCulture));
        builder.UseSetting(ConfigKeys.ApiDocs, "true");
        builder.UseSetting("App:SiteUrl", SiteUrl);
    }

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.Configure<PasswordHasherOptions>(options => options.IterationCount = 1);
        services.RemoveAll<IExchangeRateProvider>();
        services.AddSingleton<IExchangeRateProvider, FixedRateProvider>();
        services.RemoveAll<IFlexClient>();
        services.AddSingleton<IFlexClient, SampleFlexReport>();
        services.RemoveAll<IEmailTransport>();
        services.AddSingleton<FakeEmailTransport>();
        services.AddSingleton<IEmailTransport>(sp => sp.GetRequiredService<FakeEmailTransport>());
        services.RemoveAll<IDiscordWebhookClient>();
        services.AddSingleton<FakeDiscordWebhookClient>();
        services.AddSingleton<IDiscordWebhookClient>(sp => sp.GetRequiredService<FakeDiscordWebhookClient>());
        services.RemoveAll<ITelegramBotClient>();
        services.AddSingleton<FakeTelegramBotClient>();
        services.AddSingleton<ITelegramBotClient>(sp => sp.GetRequiredService<FakeTelegramBotClient>());
        services.RemoveAll<IMarketPriceProvider>();
        services.AddSingleton<IMarketPriceProvider>(new FixedPriceProvider(PriceSource.Eodhd));
        services.AddSingleton<IMarketPriceProvider>(new FixedPriceProvider(PriceSource.Kraken));
        services.RemoveAll<IReceiptReader>();
        services.AddSingleton<FakeReceiptReader>();
        services.AddSingleton<IReceiptReader>(sp => sp.GetRequiredService<FakeReceiptReader>());
    }

    protected override async ValueTask SetupAsync()
    {
        Api = CreateSessionClient();

        await Api.PostAsJsonAsync(
            "/api/setup",
            new { email = TestAdminEmail, password = TestAdminPassword, displayName = "Test Admin" });

        var loginResponse = await Api.PostAsJsonAsync(
            "/api/auth/login",
            new { email = TestAdminEmail, password = TestAdminPassword, rememberMe = false });
        loginResponse.EnsureSuccessStatusCode();
    }

    public HttpClient CreateSessionClient() =>
        CreateClient(
            client => client.DefaultRequestHeaders.Add("X-Forwarded-For", "127.0.0.1"),
            new ClientOptions { AllowAutoRedirect = false, HandleCookies = true });

    protected override async ValueTask TearDownAsync()
    {
        Api?.Dispose();
        await TestDatabases.DropAsync(ConnectionString);
    }
}
