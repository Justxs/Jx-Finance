using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Auth;

[Collection<IntegrationCollection>]
public sealed class AuthorizationTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private static readonly HashSet<string> AnonymousRoutes =
    [
        "POST /api/auth/login",
        "POST /api/auth/refresh",
        "GET /api/setup/status",
        "POST /api/setup",
        "GET /api/ping",
        "GET /api/settings/public",
    ];

    [Fact]
    public async Task Every_documented_route_outside_the_anonymous_list_rejects_a_request_without_a_session()
    {
        using var anonymous = CreateClient(handleCookies: false);
        var document = await Client.GetFromJsonAsync<JsonElement>("/openapi/v1.json");
        var open = new List<string>();
        var checkedRoutes = 0;

        foreach (var path in document.GetProperty("paths").EnumerateObject())
        {
            foreach (var operation in path.Value.EnumerateObject())
            {
                var route = $"{operation.Name.ToUpperInvariant()} {path.Name}";
                if (AnonymousRoutes.Contains(route))
                    continue;

                var url = System.Text.RegularExpressions.Regex.Replace(path.Name, "{[^}]+}", Guid.NewGuid().ToString());
                using var request = new HttpRequestMessage(new HttpMethod(operation.Name), url) { Content = EmptyBodyFor(operation.Value) };
                var response = await anonymous.SendAsync(request);
                checkedRoutes++;
                if (response.StatusCode != HttpStatusCode.Unauthorized)
                    open.Add($"{route}: {(int)response.StatusCode}");
            }
        }

        Assert.True(checkedRoutes > 50, $"Only {checkedRoutes} routes were discovered.");
        Assert.Empty(open);
    }

    private static HttpContent EmptyBodyFor(JsonElement operation)
    {
        var isMultipart = operation.TryGetProperty("requestBody", out var body)
            && body.GetProperty("content").TryGetProperty("multipart/form-data", out _);
        return isMultipart
            ? new MultipartFormDataContent { { new StringContent(""), "file" } }
            : JsonContent.Create(new { });
    }

    [Fact]
    public async Task Setup_is_refused_once_an_administrator_exists()
    {
        using var anonymous = CreateClient(handleCookies: false);

        var response = await anonymous.PostAsJsonAsync(
            "/api/setup",
            new { email = $"second-{Guid.NewGuid():N}@localhost", password = "Second-Admin-123!", displayName = "Second" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Login_is_throttled_after_ten_attempts_from_one_client()
    {
        using var client = CreateClient(handleCookies: false);
        var attempt = new { email = $"nobody-{Guid.NewGuid():N}@localhost", password = "Wrong-Password-123!", rememberMe = false };

        for (var i = 0; i < 10; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login", attempt)).StatusCode);

        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.PostAsJsonAsync("/api/auth/login", attempt)).StatusCode);
    }
}
