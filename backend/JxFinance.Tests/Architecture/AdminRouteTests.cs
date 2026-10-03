using JxFinance.Common;
using JxFinance.Infrastructure.Auth;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace JxFinance.Tests.Architecture;

[Collection<FastEndpointsPipeline>]
public sealed class AdminRouteTests
{
    private static readonly string[] AdminRoutes =
    [
        "DELETE /api/backups/{id}",
        "DELETE /api/settings/exchange-rates/{currency}/{date}",
        "GET /api/backups",
        "GET /api/backups/{id}/download",
        "GET /api/import/inbox/status",
        "GET /api/settings/discord",
        "GET /api/settings/exchange-rates",
        "GET /api/settings/market-prices",
        "GET /api/settings/smtp",
        "GET /api/users",
        "POST /api/backups",
        "POST /api/backups/upload",
        "POST /api/backups/{id}/restore",
        "POST /api/investments/securities/{id:guid}/price-symbol/find",
        "POST /api/settings/discord/test",
        "POST /api/settings/exchange-rates/sync",
        "POST /api/settings/market-prices/sync",
        "POST /api/settings/smtp/test",
        "POST /api/users",
        "POST /api/users/{id}/deactivate",
        "POST /api/users/{id}/reactivate",
        "POST /api/users/{id}/reset-password",
        "PUT /api/backups/{id}",
        "PUT /api/investments/securities/{id:guid}",
        "PUT /api/settings",
        "PUT /api/settings/discord",
        "PUT /api/settings/exchange-rates/{currency}/{date}",
        "PUT /api/settings/market-prices",
        "PUT /api/settings/smtp",
        "PUT /api/users/{id}/role",
    ];

    [Fact]
    public void Exactly_the_approved_routes_require_the_admin_role()
    {
        var admin = FastEndpointsPipeline.Endpoints
            .Where(RequiresAdmin)
            .SelectMany(Describe)
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.Equal(AdminRoutes.Order(StringComparer.Ordinal), admin);
    }

    [Fact]
    public void Every_backup_route_requires_the_admin_role()
    {
        var backups = FastEndpointsPipeline.Endpoints
            .Where(endpoint => new PathString(PathOf(endpoint)).StartsWithSegments(ApiRoutes.BackupsPath, StringComparison.OrdinalIgnoreCase))
            .ToList();

        Assert.NotEmpty(backups);
        Assert.All(backups, endpoint => Assert.True(RequiresAdmin(endpoint), PathOf(endpoint)));
    }

    private static bool RequiresAdmin(RouteEndpoint endpoint) =>
        endpoint.Metadata.GetMetadata<FastEndpoints.EndpointDefinition>()?.AllowedRoles?.Contains(AppRoles.Admin) is true;

    private static IEnumerable<string> Describe(RouteEndpoint endpoint) =>
        (endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? []).Select(method => $"{method} {PathOf(endpoint)}");

    private static string PathOf(RouteEndpoint endpoint) => "/" + endpoint.RoutePattern.RawText?.TrimStart('/');
}
