using System.Net.Http.Json;
using System.Web;
using JxFinance.Infrastructure.BackgroundJobs;
using JxFinance.Tests.Support;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Email;

public abstract class EmailTestBase(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    protected const string SmtpHost = "smtp.test";
    protected const string SenderAddress = "finance@test";

    protected FakeEmailTransport Transport => Services.GetRequiredService<FakeEmailTransport>();

    protected static object EnabledSmtp(string? password = "relay-secret") => new
    {
        enabled = true,
        host = SmtpHost,
        port = 587,
        encryption = "startTls",
        userName = "relay",
        password,
        fromAddress = SenderAddress,
        fromName = "Jx Finance",
    };

    protected static object DisabledSmtp() => new
    {
        enabled = false,
        host = (string?)null,
        port = 587,
        encryption = "startTls",
        userName = (string?)null,
        password = (string?)null,
        fromAddress = (string?)null,
        fromName = (string?)null,
    };

    protected async Task EnableEmailAsync(string? password = "relay-secret")
    {
        Transport.Reset();
        (await Client.PutAsJsonAsync("/api/settings/smtp", EnabledSmtp(password))).EnsureSuccessStatusCode();
    }

    protected async Task DisableEmailAsync()
    {
        (await Client.PutAsJsonAsync("/api/settings/smtp", DisabledSmtp())).EnsureSuccessStatusCode();
        Transport.Reset();
    }

    protected Task DrainAsync() => Job<EmailOutboxJob>().RunOnceAsync(default);

    protected Task ScanBillsAsync() => Job<RecurringBillReminderJob>().RunOnceAsync(default);

    protected static string TokenFrom(string body, string path)
    {
        var start = body.IndexOf($"{ApiFixture.SiteUrl}/{path}?", StringComparison.Ordinal);
        Assert.True(start >= 0, $"No {path} link in the message:\n{body}");
        var end = body.IndexOfAny([' ', '\r', '\n'], start);
        var link = end < 0 ? body[start..] : body[start..end];
        var query = HttpUtility.ParseQueryString(new Uri(link).Query);
        return query["token"]!;
    }
}
