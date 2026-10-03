using JxFinance.Common.Middleware;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Diagnostics;

[Collection<NotificationsCollection>]
public sealed class CorrelationIdTests(NotificationsFixture fixture) : IntegrationTestBase(fixture)
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

    [Theory]
    [InlineData("has spaces and <angle> brackets")]
    [InlineData("0123456789012345678901234567890123456789012345678901234567890123456789")]
    public async Task An_unsafe_or_overlong_inbound_id_is_replaced(string inbound)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/ping");
        request.Headers.TryAddWithoutValidation(CorrelationIdMiddleware.HeaderName, inbound);

        var response = await Client.SendAsync(request, TestContext.Current.CancellationToken);

        var correlationId = Assert.Single(response.Headers.GetValues(CorrelationIdMiddleware.HeaderName));
        Assert.NotEqual(inbound, correlationId);
        Assert.Equal(32, correlationId.Length);
    }
}
