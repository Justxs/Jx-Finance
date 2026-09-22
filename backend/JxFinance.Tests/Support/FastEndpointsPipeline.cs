using FastEndpoints;
using JxFinance.Extensions;
using JxFinance.Infrastructure;
using JxFinance.Infrastructure.Configuration;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;

namespace JxFinance.Tests.Support;

[CollectionDefinition(DisableParallelization = true)]
public sealed class FastEndpointsPipeline
{
    private static readonly Lazy<IReadOnlyList<RouteEndpoint>> Mapped = new(Map);

    public static IReadOnlyList<RouteEndpoint> Endpoints => Mapped.Value;

    private static List<RouteEndpoint> Map()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            [ConfigKeys.DefaultConnectionSetting] = "Host=localhost;Database=jx_test_unused",
            [ConfigKeys.BackgroundJobs] = "false",
        });
        builder.AddApiServices();
        builder.Services.AddInfrastructure(builder.Configuration);
        var app = builder.Build();
        app.UseFastEndpoints(ApiPipelineExtensions.ConfigureFastEndpoints);
        return [.. ((IEndpointRouteBuilder)app).DataSources.SelectMany(source => source.Endpoints).OfType<RouteEndpoint>()];
    }
}
