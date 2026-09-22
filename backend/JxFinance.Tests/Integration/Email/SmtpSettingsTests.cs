using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Email;

[Collection<IntegrationCollection>]
public sealed class SmtpSettingsTests(ApiFixture fixture) : EmailTestBase(fixture)
{
    [Fact]
    public async Task Settings_round_trip_without_ever_returning_the_password()
    {
        try
        {
            var saved = await Client.PutAsJsonAsync("/api/settings/smtp", EnabledSmtp(), TestContext.Current.CancellationToken);
            saved.EnsureSuccessStatusCode();
            var body = await saved.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

            var read = await Client.GetAsync("/api/settings/smtp", TestContext.Current.CancellationToken);
            var readBody = await read.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
            var settings = await read.Content.ReadFromJsonAsync<SmtpDto>(TestContext.Current.CancellationToken);

            Assert.DoesNotContain("relay-secret", body, StringComparison.Ordinal);
            Assert.DoesNotContain("relay-secret", readBody, StringComparison.Ordinal);
            Assert.DoesNotContain("\"password\"", readBody, StringComparison.OrdinalIgnoreCase);
            Assert.True(settings!.Enabled);
            Assert.Equal(SmtpHost, settings.Host);
            Assert.Equal(587, settings.Port);
            Assert.Equal("startTls", settings.Encryption);
            Assert.Equal("relay", settings.UserName);
            Assert.Equal(SenderAddress, settings.FromAddress);
            Assert.True(settings.HasPassword);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task An_empty_password_keeps_the_stored_one_and_clearing_the_user_name_forgets_it()
    {
        try
        {
            (await Client.PutAsJsonAsync("/api/settings/smtp", EnabledSmtp(), TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

            var kept = await SaveAsync(EnabledSmtp(password: ""));
            Assert.True(kept.HasPassword);

            var anonymous = await SaveAsync(new
            {
                enabled = true,
                host = SmtpHost,
                port = 25,
                encryption = "none",
                userName = (string?)null,
                password = (string?)null,
                fromAddress = SenderAddress,
                fromName = (string?)null,
            });

            Assert.False(anonymous.HasPassword);
            Assert.Null(anonymous.UserName);
            Assert.Equal("none", anonymous.Encryption);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Theory]
    [InlineData("smtp.elsewhere.test", "relay")]
    [InlineData(SmtpHost, "someone-else")]
    public async Task The_stored_password_is_not_carried_to_another_server_or_user(string host, string userName)
    {
        try
        {
            await EnableEmailAsync();

            var refused = await Client.PutAsJsonAsync("/api/settings/smtp", Smtp(host, userName, password: null), TestContext.Current.CancellationToken);
            await AssertProblemAsync(refused, HttpStatusCode.BadRequest, "email.passwordRequired");

            var stored = await Client.GetFromJsonAsync<SmtpDto>("/api/settings/smtp", TestContext.Current.CancellationToken);
            Assert.Equal(SmtpHost, stored!.Host);
            Assert.Equal("relay", stored.UserName);

            var moved = await SaveAsync(Smtp(host, userName, password: "new-secret"));
            Assert.Equal(host, moved.Host);
            Assert.True(moved.HasPassword);

            await Client.PostAsync("/api/settings/smtp/test", null, TestContext.Current.CancellationToken);
            Assert.Equal("new-secret", Assert.Single(Transport.Sent).Delivery.Password);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task The_host_is_compared_without_case_or_surrounding_spaces()
    {
        try
        {
            await EnableEmailAsync();

            var kept = await SaveAsync(Smtp($"  {SmtpHost.ToUpperInvariant()} ", "relay", password: null));

            Assert.True(kept.HasPassword);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task A_user_name_needs_an_encrypted_connection()
    {
        var response = await Client.PutAsJsonAsync("/api/settings/smtp", new
        {
            enabled = true,
            host = SmtpHost,
            port = 25,
            encryption = "none",
            userName = "relay",
            password = "relay-secret",
            fromAddress = SenderAddress,
            fromName = (string?)null,
        }, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "encryption");
        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "email.insecureConnection");
    }

    [Fact]
    public async Task Switching_email_on_needs_a_host_and_a_sender_address()
    {
        var response = await Client.PutAsJsonAsync("/api/settings/smtp", new
        {
            enabled = true,
            host = (string?)null,
            port = 587,
            encryption = "startTls",
            userName = (string?)null,
            password = (string?)null,
            fromAddress = (string?)null,
            fromName = (string?)null,
        }, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "host");
    }

    [Fact]
    public async Task An_out_of_range_port_is_refused()
    {
        var response = await Client.PutAsJsonAsync("/api/settings/smtp", new
        {
            enabled = false,
            host = SmtpHost,
            port = 70000,
            encryption = "startTls",
            userName = (string?)null,
            password = (string?)null,
            fromAddress = SenderAddress,
            fromName = (string?)null,
        }, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, "port");
    }

    [Fact]
    public async Task Only_an_administrator_reads_or_changes_the_mail_server()
    {
        using var member = await CreateUserClientAsync();

        Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync("/api/settings/smtp", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await member.PutAsJsonAsync("/api/settings/smtp", DisabledSmtp(), TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.PostAsync("/api/settings/smtp/test", null, TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task A_test_message_reports_the_mail_server_answer()
    {
        try
        {
            await EnableEmailAsync();

            var accepted = await Client.PostAsync("/api/settings/smtp/test", null, TestContext.Current.CancellationToken);
            var sent = Assert.Single(Transport.To(ApiFixture.TestAdminEmail));

            Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
            Assert.Equal(ApiFixture.TestAdminEmail, (await accepted.Content.ReadFromJsonAsync<TestDto>(TestContext.Current.CancellationToken))!.SentTo);
            Assert.Equal(SenderAddress, sent.Delivery.FromAddress);
            Assert.Equal("relay-secret", sent.Delivery.Password);
            Assert.Contains("test message", sent.Email.Subject, StringComparison.OrdinalIgnoreCase);

            Transport.FailWith = "535 5.7.8 Authentication credentials invalid";
            var refused = await Client.PostAsync("/api/settings/smtp/test", null, TestContext.Current.CancellationToken);

            await AssertProblemAsync(refused, HttpStatusCode.BadRequest, "email.sendFailed");
            Assert.Contains("535 5.7.8", await refused.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), StringComparison.Ordinal);
        }
        finally
        {
            await DisableEmailAsync();
        }
    }

    [Fact]
    public async Task A_test_message_without_settings_says_so_and_stores_nothing()
    {
        await DisableEmailAsync();

        var response = await Client.PostAsync("/api/settings/smtp/test", null, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "email.notConfigured");
        Assert.Empty(Transport.Sent);
        await DrainAsync();
        Assert.Empty(Transport.Sent);
    }

    [Fact]
    public async Task The_public_settings_say_whether_email_works()
    {
        using var anonymous = CreateClient();
        try
        {
            await EnableEmailAsync();
            Assert.True((await anonymous.GetFromJsonAsync<PublicDto>("/api/settings/public", TestContext.Current.CancellationToken))!.EmailEnabled);
        }
        finally
        {
            await DisableEmailAsync();
        }

        Assert.False((await anonymous.GetFromJsonAsync<PublicDto>("/api/settings/public", TestContext.Current.CancellationToken))!.EmailEnabled);
    }

    private static object Smtp(string host, string userName, string? password) => new
    {
        enabled = true,
        host,
        port = 587,
        encryption = "startTls",
        userName,
        password,
        fromAddress = SenderAddress,
        fromName = "Jx Finance",
    };

    private async Task<SmtpDto> SaveAsync(object request)
    {
        var response = await Client.PutAsJsonAsync("/api/settings/smtp", request);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<SmtpDto>())!;
    }

    private sealed record SmtpDto(
        bool Enabled,
        string? Host,
        int Port,
        string Encryption,
        string? UserName,
        bool HasPassword,
        string? FromAddress,
        string? FromName);

    private sealed record TestDto(string SentTo);

    private sealed record PublicDto(string? InstanceName, string DefaultLanguage, bool EmailEnabled);
}
