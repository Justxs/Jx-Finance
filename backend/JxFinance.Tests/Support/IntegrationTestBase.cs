using Microsoft.AspNetCore.Mvc.Testing;

namespace JxFinance.Tests.Support;

public abstract class IntegrationTestBase(ApiFixture fixture)
{
    protected HttpClient Client => fixture.Client;

    protected WebApplicationFactory<Program> Factory => fixture.Factory;
}
