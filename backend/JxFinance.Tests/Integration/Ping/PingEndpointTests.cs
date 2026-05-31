using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Ping;

[Collection(IntegrationCollection.Name)]
public sealed class PingEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Ping_returns_pong()
    {
        var response = await Client.GetAsync("/api/ping");
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<PingResponse>();
        Assert.NotNull(body);
        Assert.Equal("pong", body!.Message);
        Assert.True(body.UtcNow <= DateTimeOffset.UtcNow);
    }

    private sealed record PingResponse(string Message, DateTimeOffset UtcNow);
}
