using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using FastEndpoints.Security;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Auth;

[Collection<IntegrationCollection>]
public sealed class SessionEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Login_issues_http_only_access_and_refresh_cookies()
    {
        var user = await CreateUserAsync();
        using var client = CreateClient(handleCookies: false);

        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password, rememberMe = false });

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var cookies = SetCookies(login);
        Assert.Contains("httponly", cookies[AuthCookies.AccessToken].Attributes);
        Assert.Contains("samesite=strict", cookies[AuthCookies.AccessToken].Attributes);
        Assert.Contains("httponly", cookies[AuthCookies.RefreshToken].Attributes);
        Assert.Contains($"path={AuthCookies.RefreshTokenPath}", cookies[AuthCookies.RefreshToken].Attributes);
        Assert.DoesNotContain(cookies[AuthCookies.AccessToken].Value, await login.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Refresh_rotates_the_refresh_token()
    {
        var user = await CreateUserAsync();
        using var client = CreateClient(handleCookies: false);
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password, rememberMe = false });
        var issued = SetCookies(login);

        var refresh = await SendAsync(client, HttpMethod.Post, "/api/auth/refresh", issued[AuthCookies.RefreshToken]);
        Assert.Equal(HttpStatusCode.NoContent, refresh.StatusCode);
        var rotated = SetCookies(refresh);
        Assert.NotEqual(issued[AuthCookies.RefreshToken].Value, rotated[AuthCookies.RefreshToken].Value);

        var me = await SendAsync(client, HttpMethod.Get, "/api/auth/me", rotated[AuthCookies.AccessToken]);
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
    }

    [Fact]
    public async Task A_second_tab_refreshing_with_the_previous_token_gets_an_access_token_and_keeps_the_fresh_refresh_cookie()
    {
        var user = await CreateUserAsync();
        using var client = CreateClient(handleCookies: false);
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password, rememberMe = false });
        var issued = SetCookies(login);
        var firstTab = SetCookies(await SendAsync(client, HttpMethod.Post, "/api/auth/refresh", issued[AuthCookies.RefreshToken]));

        var secondTab = await SendAsync(client, HttpMethod.Post, "/api/auth/refresh", issued[AuthCookies.RefreshToken]);

        Assert.Equal(HttpStatusCode.NoContent, secondTab.StatusCode);
        var secondTabCookies = SetCookies(secondTab);
        Assert.DoesNotContain(AuthCookies.RefreshToken, secondTabCookies.Keys);
        Assert.NotEqual("", secondTabCookies[AuthCookies.AccessToken].Value);
        var me = await SendAsync(client, HttpMethod.Get, "/api/auth/me", secondTabCookies[AuthCookies.AccessToken]);
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);

        var next = await SendAsync(client, HttpMethod.Post, "/api/auth/refresh", firstTab[AuthCookies.RefreshToken]);
        Assert.Equal(HttpStatusCode.NoContent, next.StatusCode);
    }

    [Fact]
    public async Task Concurrent_refreshes_of_one_session_all_succeed_and_leave_one_valid_refresh_token()
    {
        var user = await CreateUserAsync();
        using var client = CreateClient(handleCookies: false);
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password, rememberMe = false });
        var issued = SetCookies(login);

        var responses = await Task.WhenAll(Enumerable.Range(0, 4)
            .Select(_ => SendAsync(client, HttpMethod.Post, "/api/auth/refresh", issued[AuthCookies.RefreshToken])));

        Assert.All(responses, response => Assert.Equal(HttpStatusCode.NoContent, response.StatusCode));
        var winner = Assert.Single(responses, response => SetCookies(response).ContainsKey(AuthCookies.RefreshToken));
        var next = await SendAsync(client, HttpMethod.Post, "/api/auth/refresh", SetCookies(winner)[AuthCookies.RefreshToken]);
        Assert.Equal(HttpStatusCode.NoContent, next.StatusCode);
    }

    [Fact]
    public async Task Replaying_the_previous_token_after_the_grace_window_revokes_the_session()
    {
        var user = await CreateUserAsync();
        using var client = CreateClient(handleCookies: false);
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password, rememberMe = false });
        var issued = SetCookies(login);
        var rotated = SetCookies(await SendAsync(client, HttpMethod.Post, "/api/auth/refresh", issued[AuthCookies.RefreshToken]));

        using (var scope = Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var rotatedAt = DateTimeOffset.UtcNow.AddMinutes(-1);
            await db.UserSessions
                .Where(s => s.UserId == user.Id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.RotatedAt, rotatedAt), TestContext.Current.CancellationToken);
        }

        var replay = await SendAsync(client, HttpMethod.Post, "/api/auth/refresh", issued[AuthCookies.RefreshToken]);
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);
        Assert.Equal("", SetCookies(replay)[AuthCookies.RefreshToken].Value);

        var legitimate = await SendAsync(client, HttpMethod.Post, "/api/auth/refresh", rotated[AuthCookies.RefreshToken]);
        Assert.Equal(HttpStatusCode.Unauthorized, legitimate.StatusCode);
    }

    [Fact]
    public async Task Deactivation_revokes_the_access_token_and_the_refresh_token()
    {
        var user = await CreateUserAsync();
        using var client = CreateClient(handleCookies: false);
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password, rememberMe = true });
        var issued = SetCookies(login);

        var deactivate = await Client.PostAsync($"/api/users/{user.Id}/deactivate", null);
        Assert.Equal(HttpStatusCode.NoContent, deactivate.StatusCode);

        var me = await SendAsync(client, HttpMethod.Get, "/api/auth/me", issued[AuthCookies.AccessToken]);
        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
        var refresh = await SendAsync(client, HttpMethod.Post, "/api/auth/refresh", issued[AuthCookies.RefreshToken]);
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    [Fact]
    public async Task Logout_ends_the_session()
    {
        var user = await CreateUserAsync();
        using var client = CreateClient(handleCookies: false);
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = user.Email, password = user.Password, rememberMe = false });
        var issued = SetCookies(login);

        var logout = await SendAsync(client, HttpMethod.Post, "/api/auth/logout", issued[AuthCookies.AccessToken]);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var refresh = await SendAsync(client, HttpMethod.Post, "/api/auth/refresh", issued[AuthCookies.RefreshToken]);
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    [Theory]
    [InlineData("not-a-guid")]
    [InlineData("00000000-0000-0000-0000-000000000000")]
    [InlineData(null)]
    public async Task Token_without_a_valid_user_id_is_rejected_instead_of_seeing_empty_data(string? userId)
    {
        var signingKey = Services.GetRequiredService<JwtSigningKey>();
        var token = JwtBearer.CreateToken(o =>
        {
            o.SigningKey = signingKey.Value;
            o.ExpireAt = DateTime.UtcNow.AddMinutes(5);
            if (userId is not null)
                o.User.Claims.Add(new Claim(ClaimTypes.NameIdentifier, userId));
        });
        using var client = CreateClient(handleCookies: false);

        var accounts = await SendAsync(client, HttpMethod.Get, "/api/accounts", new IssuedCookie(AuthCookies.AccessToken, token, ""));

        Assert.Equal(HttpStatusCode.Unauthorized, accounts.StatusCode);
    }

    private static Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string url, IssuedCookie cookie)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("Cookie", $"{cookie.Name}={cookie.Value}");
        return client.SendAsync(request);
    }

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
}
