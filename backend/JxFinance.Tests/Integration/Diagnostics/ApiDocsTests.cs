using System.Net;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.Diagnostics;

[Collection(IntegrationCollection.Name)]
public sealed class ApiDocsTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task Root_redirects_to_scalar_docs()
    {
        var response = await Client.GetAsync("/");

        Assert.Equal(HttpStatusCode.Redirect, response.StatusCode);
        Assert.Equal("/scalar/v1", response.Headers.Location?.OriginalString);
    }

    [Fact]
    public async Task OpenApi_document_is_served_and_lists_the_ping_endpoint()
    {
        var response = await Client.GetAsync("/openapi/v1.json");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains("/api/ping", json);
    }
}
