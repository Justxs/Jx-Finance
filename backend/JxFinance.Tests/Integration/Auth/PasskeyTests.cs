using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using JxFinance.Infrastructure.Auth;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Auth;

[Collection<PeopleCollection>]
public sealed class PasskeyTests(PeopleFixture fixture) : IntegrationTestBase(fixture)
{
    private const string WrongPassword = "Wrong-Password-123!";
    private const string TemporaryPassword = "Temporary-Password-456!";

    [Fact]
    public async Task An_added_passkey_is_listed_renamed_and_removed()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        using var authenticator = new SoftwareAuthenticator();

        var added = await authenticator.RegisterAsync(client, user.Password, "Laptop");

        Assert.Equal(HttpStatusCode.Created, added.StatusCode);
        var passkey = await added.Content.ReadFromJsonAsync<PasskeyDto>(TestContext.Current.CancellationToken);
        Assert.Equal(new PasskeyDto(authenticator.Id, "Laptop", passkey!.CreatedAt, true), passkey);
        var listed = Assert.Single(await ListAsync(client));
        Assert.Equal(passkey with { CreatedAt = listed.CreatedAt }, listed);
        Assert.Equal(passkey.CreatedAt, listed.CreatedAt, TimeSpan.FromMilliseconds(1));

        var renamed = await client.PutAsJsonAsync($"/api/auth/passkeys/{authenticator.Id}", new { name = "  Phone  " }, TestContext.Current.CancellationToken);
        Assert.Equal("Phone", (await ReadOkAsync<PasskeyDto>(renamed)).Name);

        using var other = await CreateUserClientAsync();
        await AssertProblemAsync(await other.DeleteAsync($"/api/auth/passkeys/{authenticator.Id}", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "resource.notFound");
        await AssertProblemAsync(await client.DeleteAsync("/api/auth/passkeys/not*base64", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "resource.notFound");
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/auth/passkeys/{authenticator.Id}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Empty(await ListAsync(client));
    }

    [Fact]
    public async Task The_state_cookie_is_http_only_strict_and_scoped_to_the_passkey_routes()
    {
        using var client = CreateClient(handleCookies: false);

        var options = await client.PostAsync("/api/auth/passkeys/sign-in-options", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, options.StatusCode);
        var attributes = SetCookies(options)[AuthCookies.PasskeyState].Attributes;
        Assert.Contains("httponly", attributes);
        Assert.Contains("samesite=strict", attributes);
        Assert.Contains($"path={AuthCookies.PasskeyStatePath}", attributes);
    }

    [Fact]
    public async Task A_wrong_password_is_refused_and_counts_toward_the_lockout()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);

        for (var attempt = 1; attempt <= 4; attempt++)
        {
            await AssertProblemAsync(await BeginRegistrationAsync(client, WrongPassword), HttpStatusCode.BadRequest, "password.incorrect");
        }

        await AssertProblemAsync(await BeginRegistrationAsync(client, WrongPassword), HttpStatusCode.TooManyRequests, "credentials.lockedOut");
    }

    [Fact]
    public async Task Finishing_without_a_state_is_refused()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        using var authenticator = new SoftwareAuthenticator();

        var response = await client.PostAsJsonAsync(
            "/api/auth/passkeys",
            new { credentialJson = authenticator.Create(FakeCreationOptions()), name = "Key" },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "passkey.stateInvalid");
    }

    [Fact]
    public async Task A_state_from_another_session_is_refused()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        using var authenticator = new SoftwareAuthenticator();
        var options = await ReadOptionsAsync(await BeginRegistrationAsync(client, user.Password));

        (await TryLoginAsync(client, user.Email, user.Password)).EnsureSuccessStatusCode();
        var response = await client.PostAsJsonAsync(
            "/api/auth/passkeys",
            new { credentialJson = authenticator.Create(options), name = "Key" },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "passkey.stateInvalid");
        Assert.Empty(await ListAsync(client));
    }

    [Fact]
    public async Task A_state_older_than_five_minutes_is_refused()
    {
        var user = await CreateUserAsync();
        using var client = CreateClient(handleCookies: false);
        var issued = SetCookies(await TryLoginAsync(client, user.Email, user.Password));
        var sessionId = Guid.ParseExact(issued[AuthCookies.RefreshToken].Value.Split('.')[0], "N");
        var expired = await StateAsync(new PasskeyState(PasskeyCeremony.Registration, "{}", user.Id, sessionId, DateTimeOffset.UtcNow.AddSeconds(-1)));
        using var authenticator = new SoftwareAuthenticator();

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/passkeys")
        {
            Content = JsonContent.Create(new { credentialJson = authenticator.Create(FakeCreationOptions()), name = "Key" }),
        };
        request.Headers.Add("Cookie", $"{AuthCookies.AccessToken}={issued[AuthCookies.AccessToken].Value}; {AuthCookies.PasskeyState}={expired}");
        var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "passkey.stateInvalid");
    }

    [Fact]
    public async Task The_eleventh_passkey_is_refused()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        await using (var scope = Services.CreateAsyncScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
            var owner = (await users.FindByIdAsync(user.Id.ToString()))!;
            for (var index = 0; index < 10; index++)
            {
                await users.AddOrUpdatePasskeyAsync(owner, new UserPasskeyInfo(
                    RandomNumberGenerator.GetBytes(16), [1], DateTimeOffset.UtcNow, 0, [], true, false, false, [], [])
                { Name = $"Key {index}" });
            }
        }

        await AssertProblemAsync(await BeginRegistrationAsync(client, user.Password), HttpStatusCode.Conflict, "passkey.limitReached");
        Assert.Equal(10, (await ListAsync(client)).Count);
    }

    [Fact]
    public async Task A_passkey_signs_in_with_both_cookies_and_a_session_and_asks_a_two_factor_user_for_no_code()
    {
        var user = await CreateUserAsync();
        using var owner = await LoginAsync(user);
        var setup = await PostAsync<SetupDto>(owner, "/api/auth/2fa/setup", new { password = user.Password });
        await PostAsync<JsonElement>(owner, "/api/auth/2fa/enable", new { code = Totp.GenerateCode(setup.SharedKey) });
        using var authenticator = new SoftwareAuthenticator();
        (await authenticator.RegisterAsync(owner, user.Password)).EnsureSuccessStatusCode();
        var sessionsBefore = await SessionCountAsync(user.Id);
        using var visitor = CreateClient(handleCookies: false);
        var options = await visitor.PostAsync("/api/auth/passkeys/sign-in-options", null, TestContext.Current.CancellationToken);
        var state = SetCookies(options)[AuthCookies.PasskeyState].Value;

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/passkeys/sign-in")
        {
            Content = JsonContent.Create(new { credentialJson = authenticator.Get(await ReadOptionsAsync(options)), rememberMe = true }),
        };
        request.Headers.Add("Cookie", $"{AuthCookies.PasskeyState}={state}");
        var response = await visitor.SendAsync(request, TestContext.Current.CancellationToken);

        var login = await ReadOkAsync<LoginDto>(response);
        Assert.False(login.TwoFactorRequired);
        Assert.Equal(user.Id, login.Profile!.Id);
        var cookies = SetCookies(response);
        Assert.Contains(AuthCookies.AccessToken, cookies.Keys);
        Assert.Contains(AuthCookies.RefreshToken, cookies.Keys);
        Assert.Contains("expires=", cookies[AuthCookies.RefreshToken].Attributes);
        Assert.Equal(sessionsBefore + 1, await SessionCountAsync(user.Id));
        using var signedIn = CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await authenticator.SignInAsync(signedIn)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await signedIn.GetAsync("/api/auth/me", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task A_wrong_origin_or_relying_party_is_refused()
    {
        var (_, authenticator) = await CreateUserWithPasskeyAsync();
        using var owned = authenticator;
        using var client = CreateClient();

        authenticator.Origin = "https://evil.test";
        await AssertProblemAsync(await authenticator.SignInAsync(client), HttpStatusCode.Unauthorized, "passkey.invalid");

        authenticator.Origin = ApiFixture.SiteUrl;
        authenticator.RpId = "evil.test";
        await AssertProblemAsync(await authenticator.SignInAsync(client), HttpStatusCode.Unauthorized, "passkey.invalid");

        authenticator.RpId = new Uri(ApiFixture.SiteUrl).Host;
        Assert.Equal(HttpStatusCode.OK, (await authenticator.SignInAsync(client)).StatusCode);
    }

    [Fact]
    public async Task A_bad_signature_is_refused_and_does_not_count_toward_the_lockout()
    {
        var (user, authenticator) = await CreateUserWithPasskeyAsync();
        using var owned = authenticator;
        using var client = CreateClient();
        await TryLoginAsync(client, user.Email, WrongPassword);
        await TryLoginAsync(client, user.Email, WrongPassword);

        authenticator.BreakSignature = true;
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            await AssertProblemAsync(await authenticator.SignInAsync(client), HttpStatusCode.Unauthorized, "passkey.invalid");
        }

        Assert.Equal(2, await FailedCountAsync(user.Id));
        (await TryLoginAsync(client, user.Email, user.Password)).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Signing_in_without_a_state_is_refused()
    {
        var (_, authenticator) = await CreateUserWithPasskeyAsync();
        using var owned = authenticator;
        using var client = CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/auth/passkeys/sign-in",
            new { credentialJson = authenticator.Get(JsonSerializer.Serialize(new { challenge = "AAAA" })), rememberMe = false },
            TestContext.Current.CancellationToken);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "passkey.stateInvalid");
    }

    [Fact]
    public async Task A_locked_out_user_signs_in_with_a_passkey_and_the_counter_resets()
    {
        var (user, authenticator) = await CreateUserWithPasskeyAsync();
        using var owned = authenticator;
        using var attacker = CreateClient();
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            await TryLoginAsync(attacker, user.Email, WrongPassword);
        }

        await AssertProblemAsync(await TryLoginAsync(attacker, user.Email, user.Password), HttpStatusCode.TooManyRequests, "credentials.lockedOut");

        using var client = CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await authenticator.SignInAsync(client)).StatusCode);
        Assert.Equal(0, await FailedCountAsync(user.Id));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task A_deactivated_user_is_refused()
    {
        var (user, authenticator) = await CreateUserWithPasskeyAsync();
        using var owned = authenticator;
        (await Client.PostAsync($"/api/users/{user.Id}/deactivate", null, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        using var client = CreateClient();

        await AssertProblemAsync(await authenticator.SignInAsync(client), HttpStatusCode.Unauthorized, "credentials.invalid");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task The_sign_count_is_stored_after_each_sign_in_and_a_replayed_count_is_refused()
    {
        var (user, authenticator) = await CreateUserWithPasskeyAsync();
        using var owned = authenticator;
        using var client = CreateClient();

        for (var signIn = 1; signIn <= 2; signIn++)
        {
            Assert.Equal(HttpStatusCode.OK, (await authenticator.SignInAsync(client)).StatusCode);
            Assert.Equal(authenticator.SignCount, await StoredSignCountAsync(user.Id));
        }

        authenticator.SignCount--;
        await AssertProblemAsync(await authenticator.SignInAsync(client), HttpStatusCode.Unauthorized, "passkey.invalid");
        Assert.Equal(authenticator.SignCount, await StoredSignCountAsync(user.Id));
    }

    [Fact]
    public async Task An_administrator_reset_removes_the_passkeys_only_with_reset_two_factor()
    {
        var admin = await CreateUserAsync("Admin");
        using var adminClient = await LoginAsync(admin);
        var (user, authenticator) = await CreateUserWithPasskeyAsync();
        using var owned = authenticator;
        using var client = CreateClient();

        (await ResetAsync(adminClient, user.Id, admin.Password, resetTwoFactor: false)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await authenticator.SignInAsync(client)).StatusCode);

        (await ResetAsync(adminClient, user.Id, admin.Password, resetTwoFactor: true)).EnsureSuccessStatusCode();
        Assert.Equal(0, await PasskeyCountAsync(user.Id));
        await AssertProblemAsync(await authenticator.SignInAsync(client), HttpStatusCode.Unauthorized, "passkey.invalid");
    }

    [Fact]
    public async Task The_recovery_command_removes_the_passkeys_of_the_administrator()
    {
        var (admin, authenticator) = await CreateUserWithPasskeyAsync("Admin");
        using var owned = authenticator;

        await using (var scope = Services.CreateAsyncScope())
        {
            var user = (await scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>().FindByIdAsync(admin.Id.ToString()))!;
            await RecoveryCommand.RecoverAsync(scope.ServiceProvider, user, TemporaryPassword);
        }

        Assert.Equal(0, await PasskeyCountAsync(admin.Id));
        using var client = CreateClient();
        await AssertProblemAsync(await authenticator.SignInAsync(client), HttpStatusCode.Unauthorized, "passkey.invalid");
        (await TryLoginAsync(client, admin.Email, TemporaryPassword)).EnsureSuccessStatusCode();
    }

    private async Task<(TestUser User, SoftwareAuthenticator Authenticator)> CreateUserWithPasskeyAsync(string role = "Member")
    {
        var user = await CreateUserAsync(role);
        using var client = await LoginAsync(user);
        var authenticator = new SoftwareAuthenticator();
        Assert.Equal(HttpStatusCode.Created, (await authenticator.RegisterAsync(client, user.Password)).StatusCode);
        return (user, authenticator);
    }

    private static Task<HttpResponseMessage> BeginRegistrationAsync(HttpClient client, string password) =>
        client.PostAsJsonAsync("/api/auth/passkeys/registration-options", new { password }, TestContext.Current.CancellationToken);

    private static Task<HttpResponseMessage> ResetAsync(HttpClient client, Guid userId, string currentPassword, bool resetTwoFactor) =>
        client.PostAsJsonAsync(
            $"/api/users/{userId}/reset-password",
            new { newPassword = TemporaryPassword, currentPassword, resetTwoFactor },
            TestContext.Current.CancellationToken);

    private static async Task<List<PasskeyDto>> ListAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<PasskeyDto>>("/api/auth/passkeys", TestContext.Current.CancellationToken))!;

    private static async Task<string> ReadOptionsAsync(HttpResponseMessage response) =>
        (await ReadOkAsync<OptionsDto>(response)).OptionsJson;

    private static string FakeCreationOptions() =>
        JsonSerializer.Serialize(new { challenge = "AAAA", user = new { id = "AAAA" } });

    private async Task<string> StateAsync(PasskeyState state)
    {
        await using var scope = Services.CreateAsyncScope();
        return scope.ServiceProvider.GetRequiredService<PasskeyStateCookie>().Protect(state);
    }

    private Task<int> SessionCountAsync(Guid userId) =>
        WithDbAsync(db => db.UserSessions.CountAsync(s => s.UserId == userId, TestContext.Current.CancellationToken));

    private Task<int> PasskeyCountAsync(Guid userId) =>
        WithDbAsync(db => db.UserPasskeys.CountAsync(p => p.UserId == userId, TestContext.Current.CancellationToken));

    private Task<int> FailedCountAsync(Guid userId) =>
        WithDbAsync(db => db.Users.Where(u => u.Id == userId).Select(u => u.AccessFailedCount).SingleAsync(TestContext.Current.CancellationToken));

    private Task<uint> StoredSignCountAsync(Guid userId) =>
        WithDbAsync(async db => (await db.UserPasskeys.AsNoTracking().SingleAsync(p => p.UserId == userId, TestContext.Current.CancellationToken)).Data.SignCount);

    private static Dictionary<string, IssuedCookie> SetCookies(HttpResponseMessage response) =>
        response.Headers.GetValues("Set-Cookie")
            .Select(header =>
            {
                var separator = header.IndexOf(';');
                var pair = header[..separator].Split('=', 2);
                return new IssuedCookie(pair[0], pair[1], header[separator..].ToLowerInvariant());
            })
            .ToDictionary(cookie => cookie.Name);

    private sealed record IssuedCookie(string Name, string Value, string Attributes);

    private sealed record PasskeyDto(string Id, string Name, DateTimeOffset CreatedAt, bool IsSynced);

    private sealed record OptionsDto(string OptionsJson);

    private sealed record ProfileDto(Guid Id);

    private sealed record LoginDto(bool TwoFactorRequired, ProfileDto? Profile);
}
