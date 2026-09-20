using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Users;

[Collection<IntegrationCollection>]
public sealed class UserRecoveryTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string WrongPassword = "Wrong-Password-123!";
    private const string TemporaryPassword = "Temporary-Password-456!";

    [Fact]
    public async Task Reactivated_user_signs_in_again_and_sessions_from_before_stay_revoked()
    {
        var user = await CreateUserAsync();
        using var before = await LoginAsync(user);
        (await Client.PostAsync($"/api/users/{user.Id}/deactivate", null)).EnsureSuccessStatusCode();

        var response = await Client.PostAsync($"/api/users/{user.Id}/reactivate", null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await before.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await before.PostAsync("/api/auth/refresh", null)).StatusCode);
        using var client = CreateClient();
        (await TryLoginAsync(client, user.Email, user.Password)).EnsureSuccessStatusCode();
        var users = await Client.GetFromJsonAsync<List<JsonElement>>("/api/users?isActive=true");
        Assert.Contains(users!, u => u.GetProperty("id").GetGuid() == user.Id);
    }

    [Fact]
    public async Task Reactivating_an_active_user_changes_nothing_and_keeps_their_session()
    {
        var user = await CreateUserAsync();
        using var signedIn = await LoginAsync(user);

        var first = await Client.PostAsync($"/api/users/{user.Id}/reactivate", null);
        var second = await Client.PostAsync($"/api/users/{user.Id}/reactivate", null);

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await signedIn.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Reactivation_clears_the_failed_attempt_counter()
    {
        var user = await CreateUserAsync();
        using var client = CreateClient();
        for (var attempt = 1; attempt <= 4; attempt++)
        {
            await TryLoginAsync(client, user.Email, WrongPassword);
        }

        (await Client.PostAsync($"/api/users/{user.Id}/deactivate", null)).EnsureSuccessStatusCode();
        (await Client.PostAsync($"/api/users/{user.Id}/reactivate", null)).EnsureSuccessStatusCode();

        using var other = CreateClient();
        for (var attempt = 1; attempt <= 4; attempt++)
        {
            await AssertProblemAsync(await TryLoginAsync(other, user.Email, WrongPassword), HttpStatusCode.Unauthorized, "credentials.invalid");
        }
    }

    [Fact]
    public async Task Reactivation_is_for_administrators_and_existing_users()
    {
        var user = await CreateUserAsync();
        using var member = await CreateUserClientAsync();

        Assert.Equal(HttpStatusCode.Forbidden, (await member.PostAsync($"/api/users/{user.Id}/reactivate", null)).StatusCode);
        await AssertProblemAsync(
            await Client.PostAsync($"/api/users/{Guid.NewGuid()}/reactivate", null),
            HttpStatusCode.NotFound,
            "resource.notFound");
    }

    [Fact]
    public async Task Reset_sets_the_password_and_revokes_every_session_of_the_user()
    {
        var (admin, adminClient) = await CreateAdminAsync();
        using var owned = adminClient;
        var user = await CreateUserAsync();
        using var signedIn = await LoginAsync(user);

        var response = await ResetAsync(adminClient, user.Id, admin.Password);

        response.EnsureSuccessStatusCode();
        var profile = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(user.Id, profile.GetProperty("id").GetGuid());
        Assert.Equal(HttpStatusCode.Unauthorized, (await signedIn.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await signedIn.PostAsync("/api/auth/refresh", null)).StatusCode);
        using var client = CreateClient();
        await AssertProblemAsync(await TryLoginAsync(client, user.Email, user.Password), HttpStatusCode.Unauthorized, "credentials.invalid");
        (await TryLoginAsync(client, user.Email, TemporaryPassword)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await adminClient.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task A_wrong_administrator_password_changes_nothing_and_counts_toward_the_lockout()
    {
        var (_, adminClient) = await CreateAdminAsync();
        using var owned = adminClient;
        var user = await CreateUserAsync();

        for (var attempt = 1; attempt <= 4; attempt++)
        {
            await AssertProblemAsync(await ResetAsync(adminClient, user.Id, WrongPassword), HttpStatusCode.BadRequest, "password.incorrect");
        }

        await AssertProblemAsync(await ResetAsync(adminClient, user.Id, WrongPassword), HttpStatusCode.TooManyRequests, "credentials.lockedOut");
        using var client = CreateClient();
        (await TryLoginAsync(client, user.Email, user.Password)).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task A_weak_new_password_is_refused_and_the_old_one_keeps_working()
    {
        var (admin, adminClient) = await CreateAdminAsync();
        using var owned = adminClient;
        var user = await CreateUserAsync();

        var response = await ResetAsync(adminClient, user.Id, admin.Password, newPassword: "alllowercase");

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "password.tooWeak");
        using var client = CreateClient();
        (await TryLoginAsync(client, user.Email, user.Password)).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Missing_and_short_fields_are_reported_on_their_inputs()
    {
        var user = await CreateUserAsync();

        var missing = await Client.PostAsJsonAsync($"/api/users/{user.Id}/reset-password", new { newPassword = TemporaryPassword });
        var tooShort = await Client.PostAsJsonAsync(
            $"/api/users/{user.Id}/reset-password",
            new { newPassword = "Ab-1", currentPassword = ApiFixture.TestAdminPassword });

        await AssertValidationErrorAsync(missing, "currentPassword");
        await AssertValidationErrorAsync(tooShort, "newPassword");
    }

    [Fact]
    public async Task An_administrator_cannot_reset_their_own_password_this_way()
    {
        var (admin, adminClient) = await CreateAdminAsync();
        using var owned = adminClient;

        var response = await ResetAsync(adminClient, admin.Id, admin.Password);

        await AssertProblemAsync(response, HttpStatusCode.Forbidden, "user.selfChange");
    }

    [Fact]
    public async Task An_administrator_can_reset_another_administrator()
    {
        var (admin, adminClient) = await CreateAdminAsync();
        using var owned = adminClient;
        var other = await CreateUserAsync("Admin");

        (await ResetAsync(adminClient, other.Id, admin.Password)).EnsureSuccessStatusCode();

        using var client = CreateClient();
        (await TryLoginAsync(client, other.Email, TemporaryPassword)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/users")).StatusCode);
    }

    [Fact]
    public async Task Members_cannot_reset_passwords_and_unknown_users_are_not_found()
    {
        var (admin, adminClient) = await CreateAdminAsync();
        using var owned = adminClient;
        var member = await CreateUserAsync();
        using var memberClient = await LoginAsync(member);
        var target = await CreateUserAsync();

        Assert.Equal(HttpStatusCode.Forbidden, (await ResetAsync(memberClient, target.Id, member.Password)).StatusCode);
        await AssertProblemAsync(await ResetAsync(adminClient, Guid.NewGuid(), admin.Password), HttpStatusCode.NotFound, "resource.notFound");
    }

    [Fact]
    public async Task Two_factor_stays_on_unless_the_reset_asks_to_clear_it()
    {
        var (admin, adminClient) = await CreateAdminAsync();
        using var owned = adminClient;
        var user = await CreateUserAsync();
        using var userClient = await LoginAsync(user);
        var setup = await PostAsync<SetupDto>(userClient, "/api/auth/2fa/setup", new { password = user.Password });
        await PostAsync<JsonElement>(userClient, "/api/auth/2fa/enable", new { code = Totp.GenerateCode(setup.SharedKey) });

        var kept = await ResetAsync(adminClient, user.Id, admin.Password);

        kept.EnsureSuccessStatusCode();
        Assert.True((await kept.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("twoFactorEnabled").GetBoolean());
        using var client = CreateClient();
        var challenged = await (await TryLoginAsync(client, user.Email, TemporaryPassword)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(challenged.GetProperty("twoFactorRequired").GetBoolean());

        var cleared = await ResetAsync(adminClient, user.Id, admin.Password, resetTwoFactor: true);

        cleared.EnsureSuccessStatusCode();
        Assert.False((await cleared.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("twoFactorEnabled").GetBoolean());
        var signedIn = await (await TryLoginAsync(client, user.Email, TemporaryPassword)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(signedIn.GetProperty("twoFactorRequired").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);

        var again = await PostAsync<SetupDto>(client, "/api/auth/2fa/setup", new { password = TemporaryPassword });
        Assert.NotEqual(setup.SharedKey, again.SharedKey);
    }

    [Fact]
    public async Task Reset_ends_a_temporary_lockout_of_the_user()
    {
        var (admin, adminClient) = await CreateAdminAsync();
        using var owned = adminClient;
        var user = await CreateUserAsync();
        using var attacker = CreateClient();
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            await TryLoginAsync(attacker, user.Email, WrongPassword);
        }

        using var client = CreateClient();
        await AssertProblemAsync(await TryLoginAsync(client, user.Email, user.Password), HttpStatusCode.TooManyRequests, "credentials.lockedOut");

        (await ResetAsync(adminClient, user.Id, admin.Password)).EnsureSuccessStatusCode();

        (await TryLoginAsync(client, user.Email, TemporaryPassword)).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Reset_does_not_reactivate_a_deactivated_user()
    {
        var (admin, adminClient) = await CreateAdminAsync();
        using var owned = adminClient;
        var user = await CreateUserAsync();
        (await Client.PostAsync($"/api/users/{user.Id}/deactivate", null)).EnsureSuccessStatusCode();

        var response = await ResetAsync(adminClient, user.Id, admin.Password);

        response.EnsureSuccessStatusCode();
        Assert.False((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("isActive").GetBoolean());
        using var client = CreateClient();
        await AssertProblemAsync(await TryLoginAsync(client, user.Email, TemporaryPassword), HttpStatusCode.Unauthorized, "credentials.invalid");

        (await Client.PostAsync($"/api/users/{user.Id}/reactivate", null)).EnsureSuccessStatusCode();
        (await TryLoginAsync(client, user.Email, TemporaryPassword)).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Reset_is_rate_limited_per_client()
    {
        var (admin, adminClient) = await CreateAdminAsync();
        using var owned = adminClient;

        for (var attempt = 1; attempt <= 10; attempt++)
        {
            Assert.Equal(HttpStatusCode.NotFound, (await ResetAsync(adminClient, Guid.NewGuid(), admin.Password)).StatusCode);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, (await ResetAsync(adminClient, Guid.NewGuid(), admin.Password)).StatusCode);
    }

    private async Task<(TestUser Admin, HttpClient Client)> CreateAdminAsync()
    {
        var admin = await CreateUserAsync("Admin");
        return (admin, await LoginAsync(admin));
    }

    private static Task<HttpResponseMessage> ResetAsync(
        HttpClient client,
        Guid userId,
        string currentPassword,
        string newPassword = TemporaryPassword,
        bool resetTwoFactor = false) =>
        client.PostAsJsonAsync($"/api/users/{userId}/reset-password", new { newPassword, currentPassword, resetTwoFactor });

    private sealed record SetupDto(string SharedKey);
}
