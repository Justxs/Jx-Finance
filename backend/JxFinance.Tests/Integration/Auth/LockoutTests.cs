using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Auth;

[Collection<IntegrationCollection>]
public sealed class LockoutTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string WrongPassword = "Wrong-Password-123!";

    [Fact]
    public async Task Five_wrong_passwords_lock_the_account_even_for_the_right_password()
    {
        var user = await CreateUserAsync();
        using var client = CreateClient();

        for (var attempt = 1; attempt <= 4; attempt++)
        {
            await AssertProblemAsync(await LoginAsync(client, user.Email, WrongPassword), HttpStatusCode.Unauthorized, "credentials.invalid");
        }

        await AssertProblemAsync(await LoginAsync(client, user.Email, WrongPassword), HttpStatusCode.TooManyRequests, "credentials.lockedOut");

        using var other = CreateClient();
        await AssertProblemAsync(await LoginAsync(other, user.Email, user.Password), HttpStatusCode.TooManyRequests, "credentials.lockedOut");
    }

    [Fact]
    public async Task A_successful_sign_in_resets_the_failure_count()
    {
        var user = await CreateUserAsync();
        using var client = CreateClient();

        for (var attempt = 1; attempt <= 4; attempt++)
        {
            await LoginAsync(client, user.Email, WrongPassword);
        }

        (await LoginAsync(client, user.Email, user.Password)).EnsureSuccessStatusCode();

        using var other = CreateClient();
        for (var attempt = 1; attempt <= 4; attempt++)
        {
            await AssertProblemAsync(await LoginAsync(other, user.Email, WrongPassword), HttpStatusCode.Unauthorized, "credentials.invalid");
        }
    }

    [Fact]
    public async Task A_lockout_does_not_end_the_sessions_the_user_already_has()
    {
        var user = await CreateUserAsync();
        using var signedIn = await LoginAsync(user);
        using var attacker = CreateClient();

        for (var attempt = 1; attempt <= 5; attempt++)
        {
            await LoginAsync(attacker, user.Email, WrongPassword);
        }

        Assert.Equal(HttpStatusCode.OK, (await signedIn.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await signedIn.PostAsync("/api/auth/refresh", null)).StatusCode);
        var profile = await signedIn.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.True(profile.GetProperty("isActive").GetBoolean());
    }

    [Fact]
    public async Task Wrong_authenticator_codes_count_and_the_password_step_does_not_reset_them()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        var setup = await PostAsync<SetupDto>(client, "/api/auth/2fa/setup", new { password = user.Password });
        await PostAsync<JsonElement>(client, "/api/auth/2fa/enable", new { code = Totp.GenerateCode(setup.SharedKey) });

        using var attacker = CreateClient();
        for (var attempt = 1; attempt <= 2; attempt++)
        {
            await AssertProblemAsync(
                await LoginAsync(attacker, user.Email, user.Password, "000000"),
                HttpStatusCode.Unauthorized,
                "twoFactor.invalidCode");
            (await LoginAsync(attacker, user.Email, user.Password)).EnsureSuccessStatusCode();
        }

        using var second = CreateClient();
        await LoginAsync(second, user.Email, user.Password, "000000");
        await LoginAsync(second, user.Email, user.Password, "000000");
        await AssertProblemAsync(
            await LoginAsync(second, user.Email, user.Password, "000000"),
            HttpStatusCode.TooManyRequests,
            "credentials.lockedOut");
        await AssertProblemAsync(
            await LoginAsync(second, user.Email, user.Password, Totp.GenerateCode(setup.SharedKey)),
            HttpStatusCode.TooManyRequests,
            "credentials.lockedOut");
    }

    [Fact]
    public async Task Wrong_current_passwords_on_the_profile_count_toward_the_lockout()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        var change = new { displayName = "Test User", currentPassword = WrongPassword, newPassword = "Another-Password-123!" };

        for (var attempt = 1; attempt <= 4; attempt++)
        {
            await AssertProblemAsync(await client.PutAsJsonAsync("/api/users/me", change), HttpStatusCode.BadRequest, "password.incorrect");
        }

        await AssertProblemAsync(await client.PutAsJsonAsync("/api/users/me", change), HttpStatusCode.TooManyRequests, "credentials.lockedOut");
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task A_deactivated_user_is_refused_without_revealing_a_lockout()
    {
        var user = await CreateUserAsync();
        (await Client.PostAsync($"/api/users/{user.Id}/deactivate", null)).EnsureSuccessStatusCode();
        using var client = CreateClient();

        for (var attempt = 1; attempt <= 6; attempt++)
        {
            await AssertProblemAsync(await LoginAsync(client, user.Email, user.Password), HttpStatusCode.Unauthorized, "credentials.invalid");
        }

        var users = await Client.GetFromJsonAsync<List<JsonElement>>("/api/users?isActive=false");
        Assert.Contains(users!, u => u.GetProperty("id").GetGuid() == user.Id);
    }

    private static Task<HttpResponseMessage> LoginAsync(HttpClient client, string email, string password, string? twoFactorCode = null) =>
        client.PostAsJsonAsync("/api/auth/login", new { email, password, rememberMe = false, twoFactorCode });

    private static async Task AssertProblemAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == status, $"Expected {(int)status}, got {(int)response.StatusCode}: {body}");
        Assert.Contains($"\"{code}\"", body);
    }

    private sealed record SetupDto(string SharedKey);
}
