using FastEndpoints;
using JxFinance.Extensions;
using JxFinance.Infrastructure;
using JxFinance.Infrastructure.Configuration;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace JxFinance.Tests.Support;

[CollectionDefinition(DisableParallelization = true)]
public sealed class FastEndpointsPipeline
{
    private static readonly Lazy<WebApplication> Built = new(Build);
    private static readonly Lazy<WebApplication> App = new(Start);
    private static readonly Lazy<IReadOnlyList<RouteEndpoint>> Mapped = new(Map);

    public static IReadOnlyList<RouteEndpoint> Endpoints => Mapped.Value;

    public static IServiceProvider Services => Built.Value.Services;

    public static HttpClient CreateClient() => App.Value.GetTestClient();

    private static WebApplication Build()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            [ConfigKeys.DefaultConnectionSetting] = "Host=localhost;Database=jx_test_unused",
            [ConfigKeys.BackgroundJobs] = "false",
            [ConfigKeys.JwtSigningKey] = ApiFixture.JwtSigningKey,
            [ConfigKeys.ApiDocs] = "true",
        });
        builder.AddApiServices();
        builder.Services.AddInfrastructure(builder.Configuration);
        return builder.Build();
    }

    private static WebApplication Start()
    {
        var app = Built.Value;
        app.UseApiPipeline();
        app.Start();
        return app;
    }

    private static List<RouteEndpoint> Map() =>
    [
        .. ((IEndpointRouteBuilder)App.Value).DataSources
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .Where(endpoint => endpoint.Metadata.GetMetadata<EndpointDefinition>() is not null),
    ];
}
