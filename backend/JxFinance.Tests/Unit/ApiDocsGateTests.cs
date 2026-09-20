using JxFinance.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting.Internal;

namespace JxFinance.Tests.Unit;

public sealed class ApiDocsGateTests
{
    [Theory]
    [InlineData("Development", null, true)]
    [InlineData("Production", null, false)]
    [InlineData("Staging", null, false)]
    [InlineData("Testing", null, false)]
    [InlineData("Production", "true", true)]
    [InlineData("Development", "false", false)]
    public void Api_docs_are_served_in_development_or_when_switched_on_explicitly(string environment, string? setting, bool expected)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["App:ApiDocs"] = setting })
            .Build();

        var served = ApiPipelineExtensions.ServesApiDocs(configuration, new HostingEnvironment { EnvironmentName = environment });

        Assert.Equal(expected, served);
    }
}
