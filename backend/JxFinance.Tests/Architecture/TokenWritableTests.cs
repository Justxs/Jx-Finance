using JxFinance.Common;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace JxFinance.Tests.Architecture;

[Collection<FastEndpointsPipeline>]
public sealed class TokenWritableTests
{
    private static readonly string[] WritableRoutes =
    [
        "DELETE /api/transactions/{id}",
        "DELETE /api/transfers/{id}",
        "PATCH /api/goals/{id}/progress",
        "POST /api/recurring-bills/{id}/confirm",
        "POST /api/transactions",
        "POST /api/transactions/bulk-category",
        "POST /api/transactions/bulk-tags",
        "POST /api/transfers",
        "PUT /api/transactions/{id}",
        "PUT /api/transfers/{id}",
    ];

    private static readonly string[] NeverWritablePrefixes =
    [
        .. TokenReadableTests.NeverReadablePrefixes,
        ApiRoutes.CategoriesPath,
        ApiRoutes.BudgetsPath,
        ApiRoutes.HouseholdsPath,
        ApiRoutes.ContactsPath,
        ApiRoutes.TransactionGroupsPath,
    ];

    [Fact]
    public void Exactly_the_approved_write_routes_accept_a_read_and_write_token()
    {
        var writable = FastEndpointsPipeline.Endpoints
            .Where(endpoint => TokenWritable.Allows(endpoint.Metadata))
            .SelectMany(endpoint => MethodsOf(endpoint).Select(method => $"{method} {PathOf(endpoint)}"))
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.Equal(WritableRoutes.Order(StringComparer.Ordinal), writable);
    }

    [Fact]
    public void No_endpoint_under_a_private_or_structural_prefix_is_token_writable()
    {
        var leaked = FastEndpointsPipeline.Endpoints
            .Where(endpoint => TokenWritable.Allows(endpoint.Metadata)
                && NeverWritablePrefixes.Any(prefix => new PathString(PathOf(endpoint)).StartsWithSegments(prefix, StringComparison.OrdinalIgnoreCase)))
            .Select(PathOf)
            .ToList();

        Assert.Empty(leaked);
    }

    [Fact]
    public void No_get_route_carries_the_write_mark()
    {
        Assert.DoesNotContain(
            FastEndpointsPipeline.Endpoints,
            endpoint => TokenWritable.Allows(endpoint.Metadata) && MethodsOf(endpoint).Contains(HttpMethods.Get));
    }

    private static IReadOnlyList<string> MethodsOf(RouteEndpoint endpoint) =>
        endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? [];

    private static string PathOf(RouteEndpoint endpoint) => "/" + endpoint.RoutePattern.RawText?.TrimStart('/');
}
