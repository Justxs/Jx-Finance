using System.Net;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Diagnostics;

[Collection<IntegrationCollection>]
public sealed class HealthCheckTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Health_reports_healthy_when_database_is_reachable()
    {
        var response = await Client.GetAsync("/health", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }
}
