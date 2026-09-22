using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Auth;

[Collection<IntegrationCollection>]
public sealed class TwoFactorEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Enabling_with_a_valid_code_issues_ten_recovery_codes()
    {
        var enrolled = await EnrollAsync();
        using var client = enrolled.Client;

        Assert.Equal(10, enrolled.RecoveryCodes.Count);
        Assert.Equal(10, enrolled.RecoveryCodes.Distinct().Count());
    }

    [Fact]
    public async Task Enabling_with_a_wrong_code_is_rejected()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        await PostAsync<SetupDto>(client, "/api/auth/2fa/setup", new { password = user.Password });

        var response = await client.PostAsJsonAsync("/api/auth/2fa/enable", new { code = "000000" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Password_alone_no_longer_opens_a_session()
    {
        var enrolled = await EnrollAsync();
        using var client = enrolled.Client;

        var login = await LoginAsync(client, enrolled.User);

        var body = await login.Content.ReadFromJsonAsync<LoginDto>(TestContext.Current.CancellationToken);
        Assert.True(body!.TwoFactorRequired);
        Assert.Null(body.Profile);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task A_wrong_code_is_rejected()
    {
        var enrolled = await EnrollAsync();
        using var client = enrolled.Client;

        var login = await LoginAsync(client, enrolled.User, "000000");

        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task A_valid_authenticator_code_opens_a_session()
    {
        var enrolled = await EnrollAsync();
        using var client = enrolled.Client;

        var login = await LoginAsync(client, enrolled.User, Totp.GenerateCode(enrolled.SharedKey));

        var body = await login.Content.ReadFromJsonAsync<LoginDto>(TestContext.Current.CancellationToken);
        Assert.False(body!.TwoFactorRequired);
        Assert.NotNull(body.Profile);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task A_recovery_code_opens_a_session_once()
    {
        var enrolled = await EnrollAsync();
        using var client = enrolled.Client;
        var recoveryCode = enrolled.RecoveryCodes[0];

        var first = await LoginAsync(client, enrolled.User, recoveryCode);
        await client.PostAsync("/api/auth/logout", null, TestContext.Current.CancellationToken);
        var second = await LoginAsync(client, enrolled.User, recoveryCode);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, second.StatusCode);
    }

    [Fact]
    public async Task Disabling_returns_to_password_only_login()
    {
        var enrolled = await EnrollAsync();
        using var client = enrolled.Client;
        (await LoginAsync(client, enrolled.User, Totp.GenerateCode(enrolled.SharedKey))).EnsureSuccessStatusCode();

        var disable = await client.PostAsJsonAsync("/api/auth/2fa/disable", new { password = enrolled.User.Password }, TestContext.Current.CancellationToken);
        await client.PostAsync("/api/auth/logout", null, TestContext.Current.CancellationToken);
        var login = await LoginAsync(client, enrolled.User);

        Assert.Equal(HttpStatusCode.NoContent, disable.StatusCode);
        var body = await login.Content.ReadFromJsonAsync<LoginDto>(TestContext.Current.CancellationToken);
        Assert.False(body!.TwoFactorRequired);
        Assert.NotNull(body.Profile);
    }

    [Fact]
    public async Task Setup_requires_the_current_password()
    {
        using var client = await CreateUserClientAsync();

        var response = await client.PostAsJsonAsync("/api/auth/2fa/setup", new { password = "incorrect" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Enabling_keeps_the_session_signed_in()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        var setup = await PostAsync<SetupDto>(client, "/api/auth/2fa/setup", new { password = user.Password });

        await PostAsync<EnableDto>(client, "/api/auth/2fa/enable", new { code = Totp.GenerateCode(setup.SharedKey) });

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/refresh", null, TestContext.Current.CancellationToken)).StatusCode);
    }

    private async Task<Enrollment> EnrollAsync()
    {
        var user = await CreateUserAsync();
        var client = await LoginAsync(user);
        var setup = await PostAsync<SetupDto>(client, "/api/auth/2fa/setup", new { password = user.Password });
        var enabled = await PostAsync<EnableDto>(client, "/api/auth/2fa/enable", new { code = Totp.GenerateCode(setup.SharedKey) });
        await client.PostAsync("/api/auth/logout", null);
        return new Enrollment(client, user, setup.SharedKey, enabled.RecoveryCodes);
    }

    private static Task<HttpResponseMessage> LoginAsync(HttpClient client, TestUser user, string? twoFactorCode = null) =>
        TryLoginAsync(client, user.Email, user.Password, twoFactorCode);

    private sealed record Enrollment(HttpClient Client, TestUser User, string SharedKey, List<string> RecoveryCodes);

    private sealed record LoginDto(bool TwoFactorRequired, ProfileDto? Profile);

    private sealed record ProfileDto(Guid Id);

    private sealed record SetupDto(string SharedKey);

    private sealed record EnableDto(List<string> RecoveryCodes);
}
