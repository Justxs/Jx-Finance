using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using JxFinance.Infrastructure.Auth;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Auth;

[Collection<IntegrationCollection>]
public sealed class PersonalApiTokenTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string TemporaryPassword = "Temporary-Password-456!";

    [Fact]
    public async Task Create_answers_the_secret_once_and_the_list_never_shows_it()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);

        var response = await CreateAsync(client, user.Password, "Spreadsheet", 30);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = (await response.Content.ReadFromJsonAsync<CreatedDto>(TestContext.Current.CancellationToken))!;
        Assert.StartsWith($"jxp_{created.Prefix}_", created.Token, StringComparison.Ordinal);
        Assert.Equal(56, created.Token.Length);
        Assert.Equal("Spreadsheet", created.Name);
        Assert.Equal(TimeSpan.FromDays(30), created.ExpiresAt - created.CreatedAt);
        var listBody = await client.GetStringAsync("/api/auth/tokens", TestContext.Current.CancellationToken);
        Assert.DoesNotContain(created.Token[13..], listBody, StringComparison.Ordinal);
        Assert.DoesNotContain("hash", listBody, StringComparison.OrdinalIgnoreCase);
        var listed = Assert.Single(JsonSerializer.Deserialize<List<TokenDto>>(listBody, JsonSerializerOptions.Web)!);
        Assert.Equal(created.Id, listed.Id);
        Assert.Equal(created.Prefix, listed.Prefix);
        Assert.Null(listed.LastUsedAt);
        Assert.False(listed.IsExpired);
        var stored = await WithDbAsync(db => db.PersonalApiTokens.SingleAsync(t => t.Id == created.Id, TestContext.Current.CancellationToken));
        Assert.DoesNotContain(created.Token[13..], stored.SecretHash, StringComparison.Ordinal);
        Assert.Equal(64, stored.SecretHash.Length);
    }

    [Fact]
    public async Task A_wrong_password_answers_password_incorrect_and_counts_toward_the_lockout()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);

        var response = await CreateAsync(client, "Wrong-Password-123!", "Script", 90);

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "password.incorrect");
        Assert.Equal(1, await WithDbAsync(db => db.Users.Where(u => u.Id == user.Id).Select(u => u.AccessFailedCount).SingleAsync(TestContext.Current.CancellationToken)));
        Assert.Equal(0, await TokenCountAsync(user.Id));
    }

    [Fact]
    public async Task Create_validates_the_name_and_the_expiry()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);

        await AssertValidationErrorAsync(await CreateAsync(client, user.Password, new string('x', 61), 90), "name");
        await AssertValidationErrorAsync(await CreateAsync(client, user.Password, "Script", 0), "expiresInDays");
        await AssertValidationErrorAsync(await CreateAsync(client, user.Password, "Script", 366), "expiresInDays");
    }

    [Fact]
    public async Task The_eleventh_active_token_is_refused_and_an_expired_one_does_not_count()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        for (var i = 0; i < PersonalApiToken.MaxActivePerUser; i++)
        {
            await IssueAsync(user.Id);
        }

        await AssertProblemAsync(await CreateAsync(client, user.Password, "Eleventh", 90), HttpStatusCode.Conflict, "token.limitReached");

        await WithDbAsync(db => db.PersonalApiTokens.Where(t => t.UserId == user.Id).Take(1)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.ExpiresAt, DateTimeOffset.UtcNow.AddDays(-1)), TestContext.Current.CancellationToken));
        Assert.Equal(HttpStatusCode.Created, (await CreateAsync(client, user.Password, "Eleventh", 90)).StatusCode);
        var listed = (await client.GetFromJsonAsync<List<TokenDto>>("/api/auth/tokens", TestContext.Current.CancellationToken))!;
        Assert.Equal(11, listed.Count);
        Assert.Single(listed, t => t.IsExpired);
    }

    [Fact]
    public async Task Revoking_ends_the_token_and_another_members_token_cannot_be_revoked()
    {
        await using var on = await ApiTokensOnAsync();
        var owner = await CreateUserAsync();
        var other = await CreateUserAsync();
        using var ownerClient = await LoginAsync(owner);
        using var otherClient = await LoginAsync(other);
        var (id, token) = await IssueAsync(owner.Id);
        using var script = TokenClient(token);
        Assert.Equal(HttpStatusCode.OK, (await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken)).StatusCode);

        await AssertProblemAsync(await otherClient.DeleteAsync($"/api/auth/tokens/{id}", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "resource.notFound");
        Assert.Equal(HttpStatusCode.NoContent, (await ownerClient.DeleteAsync($"/api/auth/tokens/{id}", TestContext.Current.CancellationToken)).StatusCode);

        await AssertInvalidAsync(await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken));
        await AssertProblemAsync(await ownerClient.DeleteAsync($"/api/auth/tokens/{id}", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "resource.notFound");
    }

    [Fact]
    public async Task A_token_reads_the_same_transactions_as_its_owner_with_and_without_the_active_household()
    {
        await using var on = await ApiTokensOnAsync();
        using var pair = await CreateHouseholdPairAsync();
        var personal = await CreateAccountAsync(client: pair.OwnerClient);
        var shared = await CreateAccountAsync(householdId: pair.HouseholdId, client: pair.OwnerClient);
        await CreateTransactionAsync(pair.OwnerClient, personal, null, "expense", "12.50", "2026-07-01", "Personal lunch");
        await CreateTransactionAsync(pair.OwnerClient, shared, null, "expense", "40.00", "2026-07-02", "Shared groceries");
        var (_, token) = await IssueAsync(pair.Owner.Id);
        using var script = TokenClient(token);

        foreach (var household in new Guid?[] { null, pair.HouseholdId })
        {
            var browser = await (await SendScopedAsync(pair.OwnerClient, HttpMethod.Get, "/api/transactions", household)).Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
            var scripted = await SendScopedAsync(script, HttpMethod.Get, "/api/transactions", household);

            Assert.Equal(HttpStatusCode.OK, scripted.StatusCode);
            Assert.Equal(browser, await scripted.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        }

        var csv = await script.GetStringAsync($"/api/transactions/export?activeHousehold={pair.HouseholdId}", TestContext.Current.CancellationToken);
        Assert.Contains("Shared groceries", csv, StringComparison.Ordinal);
        Assert.Contains("Personal lunch", csv, StringComparison.Ordinal);
        var partnerCsv = await pair.PartnerClient.GetStringAsync($"/api/transactions/export?activeHousehold={pair.HouseholdId}", TestContext.Current.CancellationToken);
        Assert.DoesNotContain("Personal lunch", partnerCsv, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_token_cannot_write_nor_reach_sessions_tokens_settings_or_administration_even_for_an_administrator()
    {
        await using var on = await ApiTokensOnAsync();
        var admin = await CreateUserAsync("Admin");
        var (_, token) = await IssueAsync(admin.Id);
        using var script = TokenClient(token);

        var refused = new (HttpMethod Method, string Url)[]
        {
            (HttpMethod.Post, "/api/accounts"),
            (HttpMethod.Put, $"/api/accounts/{Guid.NewGuid()}"),
            (HttpMethod.Delete, $"/api/transactions/{Guid.NewGuid()}"),
            (HttpMethod.Get, $"/api/backups/{Guid.NewGuid()}/download"),
            (HttpMethod.Get, "/api/backups"),
            (HttpMethod.Get, "/api/auth/sessions"),
            (HttpMethod.Get, "/api/auth/tokens"),
            (HttpMethod.Get, "/api/auth/passkeys"),
            (HttpMethod.Get, "/api/auth/me"),
            (HttpMethod.Get, "/api/settings"),
            (HttpMethod.Get, "/api/settings/smtp"),
            (HttpMethod.Get, "/api/users"),
            (HttpMethod.Get, $"/api/attachments/{Guid.NewGuid()}/content"),
            (HttpMethod.Get, "/api/investments/connections"),
            (HttpMethod.Get, "/api/users/me/dashboard-layout"),
            (HttpMethod.Get, "/api/trash"),
            (HttpMethod.Get, "/api/notifications"),
            (HttpMethod.Get, "/health"),
            (HttpMethod.Get, "/api/no-such-route"),
            (HttpMethod.Post, "/api/auth/logout"),
            (HttpMethod.Post, "/api/auth/login"),
        };
        foreach (var (method, url) in refused)
        {
            using var request = new HttpRequestMessage(method, url) { Content = method == HttpMethod.Get ? null : JsonContent.Create(new { }) };
            await AssertProblemAsync(await script.SendAsync(request, TestContext.Current.CancellationToken), HttpStatusCode.Forbidden, "token.notAllowed");
        }

        Assert.Equal(HttpStatusCode.OK, (await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task Every_documented_operation_outside_the_readable_list_refuses_a_token()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        var document = await Client.GetFromJsonAsync<JsonElement>("/openapi/v1.json", TestContext.Current.CancellationToken);
        var wrong = new List<string>();
        var readable = 0;
        var refused = 0;
        HttpClient? script = null;
        var sent = 0;

        foreach (var path in document.GetProperty("paths").EnumerateObject())
        {
            foreach (var operation in path.Value.EnumerateObject())
            {
                if (sent++ % 50 == 0)
                {
                    script?.Dispose();
                    script = TokenClient((await IssueAsync(user.Id)).Token);
                }

                var route = $"{operation.Name.ToUpperInvariant()} {path.Name}";
                var url = System.Text.RegularExpressions.Regex.Replace(path.Name, "{[^}]+}", Guid.NewGuid().ToString());
                using var request = new HttpRequestMessage(new HttpMethod(operation.Name), url)
                {
                    Content = operation.Name == "get" ? null : JsonContent.Create(new { }),
                };
                var response = await script!.SendAsync(request, TestContext.Current.CancellationToken);
                var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
                var notAllowed = response.StatusCode == HttpStatusCode.Forbidden && body.Contains("\"token.notAllowed\"", StringComparison.Ordinal);
                if (AcceptsToken(operation.Value) || route == "GET /api/ping")
                {
                    readable++;
                    if (notAllowed || response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.TooManyRequests)
                        wrong.Add($"{route} should be readable: {(int)response.StatusCode}");
                }
                else
                {
                    refused++;
                    if (!notAllowed)
                        wrong.Add($"{route} should refuse a token: {(int)response.StatusCode}");
                }
            }
        }

        script?.Dispose();
        Assert.True(readable > 40, $"Only {readable} readable operations were discovered.");
        Assert.True(refused > 100, $"Only {refused} refused operations were discovered.");
        Assert.Empty(wrong);
    }

    [Fact]
    public async Task Expired_revoked_unknown_and_malformed_tokens_answer_401_token_invalid()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        var (_, expired) = await IssueAsync(user.Id, DateTimeOffset.UtcNow.AddSeconds(-1));
        var unknown = PersonalApiTokenFormat.Issue().Token;
        var (_, live) = await IssueAsync(user.Id);
        var tampered = live[..^2] + (live[^2] == 'A' ? "BA" : "AA");

        foreach (var token in new[] { expired, unknown, tampered, "jxp_short", "jxp_ABCDEFGH_not-base64url!" })
        {
            using var script = TokenClient(token);
            await AssertInvalidAsync(await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken));
            await AssertInvalidAsync(await script.GetAsync("/api/ping", TestContext.Current.CancellationToken));
        }
    }

    [Fact]
    public async Task Deactivation_deletes_the_tokens_of_the_member()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        var (_, token) = await IssueAsync(user.Id);
        await IssueAsync(user.Id);

        (await Client.PostAsync($"/api/users/{user.Id}/deactivate", null, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();

        Assert.Equal(0, await TokenCountAsync(user.Id));
        using var script = TokenClient(token);
        await AssertInvalidAsync(await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken));
        (await Client.PostAsync($"/api/users/{user.Id}/reactivate", null, TestContext.Current.CancellationToken)).EnsureSuccessStatusCode();
        await AssertInvalidAsync(await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task An_administrator_password_reset_deletes_the_tokens_and_an_own_password_change_keeps_them()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        var (_, token) = await IssueAsync(user.Id);
        using var script = TokenClient(token);

        var change = await client.PutAsJsonAsync(
            "/api/users/me",
            new { displayName = "Test User", currentPassword = user.Password, newPassword = TemporaryPassword },
            TestContext.Current.CancellationToken);
        Assert.True(change.IsSuccessStatusCode, await change.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        Assert.Equal(HttpStatusCode.OK, (await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken)).StatusCode);

        var reset = await Client.PostAsJsonAsync(
            $"/api/users/{user.Id}/reset-password",
            new { newPassword = user.Password, currentPassword = ApiFixture.TestAdminPassword, resetTwoFactor = false },
            TestContext.Current.CancellationToken);
        Assert.True(reset.IsSuccessStatusCode, await reset.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));

        Assert.Equal(0, await TokenCountAsync(user.Id));
        await AssertInvalidAsync(await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task The_recovery_command_deletes_the_tokens_of_the_administrator()
    {
        var admin = await CreateUserAsync("Admin");
        await IssueAsync(admin.Id);

        await using (var scope = Services.CreateAsyncScope())
        {
            var user = (await scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>().FindByIdAsync(admin.Id.ToString()))!;
            await RecoveryCommand.RecoverAsync(scope.ServiceProvider, user, TemporaryPassword);
        }

        Assert.Equal(0, await TokenCountAsync(admin.Id));
    }

    [Fact]
    public async Task Switching_the_feature_off_suspends_every_token_and_hides_the_list_until_it_is_back_on()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        var (_, token) = await IssueAsync(user.Id);
        using var script = TokenClient(token);

        await AssertProblemAsync(await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "feature.disabled");
        await AssertProblemAsync(await client.GetAsync("/api/auth/tokens", TestContext.Current.CancellationToken), HttpStatusCode.NotFound, "feature.disabled");
        await AssertProblemAsync(await CreateAsync(client, user.Password, "Script", 90), HttpStatusCode.NotFound, "feature.disabled");
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/accounts", TestContext.Current.CancellationToken)).StatusCode);

        await using (await ApiTokensOnAsync())
        {
            Assert.Equal(HttpStatusCode.OK, (await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken)).StatusCode);
        }

        Assert.Equal(1, await TokenCountAsync(user.Id));
    }

    [Fact]
    public async Task The_sixty_first_request_in_a_minute_answers_429_with_retry_after()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        using var script = TokenClient((await IssueAsync(user.Id)).Token);
        using var cookie = await LoginAsync(user);

        for (var i = 0; i < 60; i++)
        {
            Assert.Equal(HttpStatusCode.OK, (await script.GetAsync("/api/ping", TestContext.Current.CancellationToken)).StatusCode);
        }

        var limited = await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken);

        await AssertProblemAsync(limited, HttpStatusCode.TooManyRequests, "token.rateLimited");
        Assert.NotNull(limited.Headers.RetryAfter);
        for (var i = 0; i < 70; i++)
        {
            Assert.Equal(HttpStatusCode.OK, (await cookie.GetAsync("/api/ping", TestContext.Current.CancellationToken)).StatusCode);
        }

        using var second = TokenClient((await IssueAsync(user.Id)).Token);
        Assert.Equal(HttpStatusCode.OK, (await second.GetAsync("/api/accounts", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task The_last_used_time_moves_at_most_once_a_minute()
    {
        await using var on = await ApiTokensOnAsync();
        var user = await CreateUserAsync();
        var (id, token) = await IssueAsync(user.Id);
        using var script = TokenClient(token);

        Assert.Equal(HttpStatusCode.OK, (await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken)).StatusCode);
        Assert.NotNull(await LastUsedAsync(id));

        var recent = DateTimeOffset.UtcNow.AddSeconds(-30);
        await SetLastUsedAsync(id, recent);
        Assert.Equal(HttpStatusCode.OK, (await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(recent, (await LastUsedAsync(id))!.Value, TimeSpan.FromMilliseconds(1));

        var stale = DateTimeOffset.UtcNow.AddMinutes(-2);
        await SetLastUsedAsync(id, stale);
        Assert.Equal(HttpStatusCode.OK, (await script.GetAsync("/api/accounts", TestContext.Current.CancellationToken)).StatusCode);
        Assert.True(await LastUsedAsync(id) > stale.AddMinutes(1));
    }

    [Fact]
    public async Task A_request_with_a_token_and_a_cookie_is_the_token_user_and_cannot_reach_cookie_only_routes()
    {
        await using var on = await ApiTokensOnAsync();
        var owner = await CreateUserAsync();
        var browserUser = await CreateUserAsync("Admin");
        using var ownerBrowser = await LoginAsync(owner);
        await CreateAccountAsync(client: ownerBrowser);
        using var browser = await LoginAsync(browserUser);
        await CreateAccountAsync(client: browser);
        var (_, token) = await IssueAsync(owner.Id);
        using var script = TokenClient(token);
        var ownerAccounts = await script.GetStringAsync("/api/accounts", TestContext.Current.CancellationToken);
        browser.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        Assert.Equal(ownerAccounts, await browser.GetStringAsync("/api/accounts", TestContext.Current.CancellationToken));
        await AssertProblemAsync(await browser.GetAsync("/api/auth/me", TestContext.Current.CancellationToken), HttpStatusCode.Forbidden, "token.notAllowed");
        await AssertProblemAsync(await browser.GetAsync("/api/users", TestContext.Current.CancellationToken), HttpStatusCode.Forbidden, "token.notAllowed");

        browser.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PersonalApiTokenFormat.Issue().Token);
        await AssertInvalidAsync(await browser.GetAsync("/api/accounts", TestContext.Current.CancellationToken));

        browser.DefaultRequestHeaders.Authorization = null;
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/api/users", TestContext.Current.CancellationToken)).StatusCode);
    }

    private Task<IAsyncDisposable> ApiTokensOnAsync() =>
        OverrideSettingsAsync(settings => settings["features"]!["apiTokens"] = true);

    private HttpClient TokenClient(string token)
    {
        var client = CreateClient(handleCookies: false);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task<(Guid Id, string Token)> IssueAsync(Guid userId, DateTimeOffset? expiresAt = null)
    {
        var issued = PersonalApiTokenFormat.Issue();
        var token = new PersonalApiToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = "Seeded",
            Prefix = issued.Prefix,
            SecretHash = issued.SecretHash,
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = expiresAt ?? DateTimeOffset.UtcNow.AddDays(30),
        };
        await WithDbAsync(async db =>
        {
            db.PersonalApiTokens.Add(token);
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });
        return (token.Id, issued.Token);
    }

    private static Task<HttpResponseMessage> CreateAsync(HttpClient client, string password, string name, int expiresInDays) =>
        client.PostAsJsonAsync("/api/auth/tokens", new { name, expiresInDays, password }, TestContext.Current.CancellationToken);

    private Task<int> TokenCountAsync(Guid userId) =>
        WithDbAsync(db => db.PersonalApiTokens.CountAsync(t => t.UserId == userId, TestContext.Current.CancellationToken));

    private Task<DateTimeOffset?> LastUsedAsync(Guid id) =>
        WithDbAsync(db => db.PersonalApiTokens.Where(t => t.Id == id).Select(t => t.LastUsedAt).SingleAsync(TestContext.Current.CancellationToken));

    private Task SetLastUsedAsync(Guid id, DateTimeOffset at) =>
        WithDbAsync(db => db.PersonalApiTokens.Where(t => t.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.LastUsedAt, at), TestContext.Current.CancellationToken));

    private static async Task AssertInvalidAsync(HttpResponseMessage response)
    {
        await AssertProblemAsync(response, HttpStatusCode.Unauthorized, "token.invalid");
        Assert.Contains(response.Headers.WwwAuthenticate, header => header.Scheme == "Bearer" && header.Parameter == "error=\"invalid_token\"");
    }

    private static bool AcceptsToken(JsonElement operation) =>
        operation.TryGetProperty("security", out var security)
        && security.EnumerateArray().Any(requirement => requirement.TryGetProperty("PersonalApiToken", out _));

    private sealed record CreatedDto(Guid Id, string Name, string Prefix, DateTimeOffset CreatedAt, DateTimeOffset ExpiresAt, string Token);

    private sealed record TokenDto(Guid Id, string Name, string Prefix, DateTimeOffset CreatedAt, DateTimeOffset ExpiresAt, DateTimeOffset? LastUsedAt, bool IsExpired);
}
