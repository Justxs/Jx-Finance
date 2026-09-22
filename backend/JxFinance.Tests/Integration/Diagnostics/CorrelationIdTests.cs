using JxFinance.Common.Middleware;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Diagnostics;

[Collection<IntegrationCollection>]
public sealed class CorrelationIdTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Response_carries_a_generated_correlation_id()
    {
        var response = await Client.GetAsync("/api/ping", TestContext.Current.CancellationToken);

        var values = response.Headers.GetValues(CorrelationIdMiddleware.HeaderName).ToList();
        var correlationId = Assert.Single(values);
        Assert.False(string.IsNullOrWhiteSpace(correlationId));
    }

    [Fact]
    public async Task Response_honours_an_inbound_correlation_id()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/ping");
        request.Headers.Add(CorrelationIdMiddleware.HeaderName, "test-correlation-id");

        var response = await Client.SendAsync(request, TestContext.Current.CancellationToken);

        var correlationId = Assert.Single(response.Headers.GetValues(CorrelationIdMiddleware.HeaderName));
        Assert.Equal("test-correlation-id", correlationId);
    }
}
