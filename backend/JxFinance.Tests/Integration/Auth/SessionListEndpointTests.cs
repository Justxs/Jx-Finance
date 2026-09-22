using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Auth;

[Collection<IntegrationCollection>]
public sealed class SessionListEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task List_shows_every_signed_in_browser_and_marks_the_current_one()
    {
        var user = await CreateUserAsync();
        using var first = await LoginAsync(user, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/140.0");
        using var second = await LoginAsync(user, new string('a', 300));

        var response = await second.GetAsync("/api/auth/sessions", TestContext.Current.CancellationToken);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        var sessions = await second.GetFromJsonAsync<List<SessionDto>>("/api/auth/sessions", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain("hash", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("stamp", body, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(2, sessions!.Count);
        var current = Assert.Single(sessions, s => s.IsCurrent);
        Assert.Equal(sessions[0], current);
        Assert.Equal(new string('a', 256), current.UserAgent);
        var other = Assert.Single(sessions, s => !s.IsCurrent);
        Assert.Equal("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/140.0", other.UserAgent);
        Assert.False(other.IsPersistent);
        Assert.Equal(other.CreatedAt, other.LastSeenAt);
        Assert.True(other.ExpiresAt > other.CreatedAt);
    }

    [Fact]
    public async Task Refresh_moves_the_last_seen_time_forward()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user, "Refreshing browser");
        var before = Assert.Single((await client.GetFromJsonAsync<List<SessionDto>>("/api/auth/sessions", TestContext.Current.CancellationToken))!);

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/refresh", null, TestContext.Current.CancellationToken)).StatusCode);

        var after = Assert.Single((await client.GetFromJsonAsync<List<SessionDto>>("/api/auth/sessions", TestContext.Current.CancellationToken))!);
        Assert.Equal(before.Id, after.Id);
        Assert.True(after.LastSeenAt > before.LastSeenAt);
    }

    [Fact]
    public async Task Revoking_a_session_signs_that_browser_out_at_once()
    {
        var user = await CreateUserAsync();
        using var first = await LoginAsync(user, "First browser");
        using var second = await LoginAsync(user, "Second browser");
        var target = (await second.GetFromJsonAsync<List<SessionDto>>("/api/auth/sessions", TestContext.Current.CancellationToken))!.Single(s => !s.IsCurrent);

        var revoke = await second.DeleteAsync($"/api/auth/sessions/{target.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, revoke.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await first.GetAsync("/api/auth/me", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await first.PostAsync("/api/auth/refresh", null, TestContext.Current.CancellationToken)).StatusCode);
        var left = Assert.Single((await second.GetFromJsonAsync<List<SessionDto>>("/api/auth/sessions", TestContext.Current.CancellationToken))!);
        Assert.True(left.IsCurrent);
    }

    [Fact]
    public async Task Revoke_others_keeps_only_the_current_session()
    {
        var user = await CreateUserAsync();
        using var first = await LoginAsync(user, "First browser");
        using var second = await LoginAsync(user, "Second browser");
        using var third = await LoginAsync(user, "Third browser");

        var revoke = await third.PostAsync("/api/auth/sessions/revoke-others", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, revoke.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await first.GetAsync("/api/auth/me", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await second.GetAsync("/api/auth/me", TestContext.Current.CancellationToken)).StatusCode);
        var left = Assert.Single((await third.GetFromJsonAsync<List<SessionDto>>("/api/auth/sessions", TestContext.Current.CancellationToken))!);
        Assert.True(left.IsCurrent);
        Assert.Equal(HttpStatusCode.NoContent, (await third.PostAsync("/api/auth/sessions/revoke-others", null, TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task Another_users_session_is_neither_listed_nor_revocable()
    {
        var owner = await CreateUserAsync();
        var stranger = await CreateUserAsync();
        using var ownerClient = await LoginAsync(owner, "Owner browser");
        using var strangerClient = await LoginAsync(stranger, "Stranger browser");
        var ownerSession = Assert.Single((await ownerClient.GetFromJsonAsync<List<SessionDto>>("/api/auth/sessions", TestContext.Current.CancellationToken))!);

        var revoke = await strangerClient.DeleteAsync($"/api/auth/sessions/{ownerSession.Id}", TestContext.Current.CancellationToken);
        var unknown = await strangerClient.DeleteAsync($"/api/auth/sessions/{Guid.NewGuid()}", TestContext.Current.CancellationToken);
        await strangerClient.PostAsync("/api/auth/sessions/revoke-others", null, TestContext.Current.CancellationToken);

        await AssertProblemAsync(revoke, HttpStatusCode.NotFound, "resource.notFound");
        await AssertProblemAsync(unknown, HttpStatusCode.NotFound, "resource.notFound");
        Assert.Equal(HttpStatusCode.OK, (await ownerClient.GetAsync("/api/auth/me", TestContext.Current.CancellationToken)).StatusCode);
        var strangerSessions = await strangerClient.GetFromJsonAsync<List<SessionDto>>("/api/auth/sessions", TestContext.Current.CancellationToken);
        Assert.DoesNotContain(strangerSessions!, s => s.Id == ownerSession.Id);
    }

    [Fact]
    public async Task The_current_session_cannot_be_revoked()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user, "Only browser");
        var current = Assert.Single((await client.GetFromJsonAsync<List<SessionDto>>("/api/auth/sessions", TestContext.Current.CancellationToken))!);

        var revoke = await client.DeleteAsync($"/api/auth/sessions/{current.Id}", TestContext.Current.CancellationToken);

        await AssertProblemAsync(revoke, HttpStatusCode.Forbidden, "session.current");
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task Sessions_require_a_signed_in_user()
    {
        using var anonymous = CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/auth/sessions", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.DeleteAsync($"/api/auth/sessions/{Guid.NewGuid()}", TestContext.Current.CancellationToken)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsync("/api/auth/sessions/revoke-others", null, TestContext.Current.CancellationToken)).StatusCode);
    }

    private async Task<HttpClient> LoginAsync(TestUser user, string userAgent)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", userAgent);
        (await TryLoginAsync(client, user.Email, user.Password)).EnsureSuccessStatusCode();
        return client;
    }

    private sealed record SessionDto(
        Guid Id,
        DateTimeOffset CreatedAt,
        DateTimeOffset LastSeenAt,
        DateTimeOffset ExpiresAt,
        bool IsPersistent,
        string? UserAgent,
        bool IsCurrent);
}
