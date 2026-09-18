using FastEndpoints.Testing;

namespace JxFinance.Tests.Support;

public abstract class IntegrationTestBase(ApiFixture fixture)
{
    protected HttpClient Client => fixture.Api;

    protected IServiceProvider Services => fixture.Services;

    protected HttpClient CreateClient(ClientOptions options) => fixture.CreateClient(options);
}
