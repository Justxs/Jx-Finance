using JxFinance.Common;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace JxFinance.Tests.Architecture;

[Collection<FastEndpointsPipeline>]
public sealed class TokenWritableTests
{
    private const string ListName = "WritableRoutes in Architecture/TokenWritableTests.cs";

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

        ApprovedList.AssertMatches(
            WritableRoutes.Order(StringComparer.Ordinal),
            writable,
            ListName,
            route => $"{route} accepts a read-and-write token but is not in {ListName}. Add it if such a token may call it, or remove Metadata(TokenWritable.Yes) from its endpoint.",
            route => $"{route} is in {ListName} but does not accept a read-and-write token or no longer exists. Remove it from the list if that is intended, or add Metadata(TokenWritable.Yes) to its endpoint's Configure.");
    }

    [Fact]
    public void No_endpoint_under_a_private_or_structural_prefix_is_token_writable()
    {
        var leaked = FastEndpointsPipeline.Endpoints
            .Where(endpoint => TokenWritable.Allows(endpoint.Metadata)
                && NeverWritablePrefixes.Any(prefix => new PathString(PathOf(endpoint)).StartsWithSegments(prefix, StringComparison.OrdinalIgnoreCase)))
            .Select(PathOf)
            .ToList();

        Assert.True(
            leaked.Count == 0,
            string.Join(Environment.NewLine, leaked.Select(path =>
                $"{path} accepts a read-and-write token but sits under a prefix in NeverWritablePrefixes in Architecture/TokenWritableTests.cs. Remove Metadata(TokenWritable.Yes) from its endpoint.")));
    }

    [Fact]
    public void No_get_route_carries_the_write_mark()
    {
        var marked = FastEndpointsPipeline.Endpoints
            .Where(endpoint => TokenWritable.Allows(endpoint.Metadata) && MethodsOf(endpoint).Contains(HttpMethods.Get))
            .Select(PathOf)
            .ToList();

        Assert.True(
            marked.Count == 0,
            string.Join(Environment.NewLine, marked.Select(path =>
                $"GET {path} carries Metadata(TokenWritable.Yes). A read is opened to tokens by its group's tokenReadable: true; remove the write mark.")));
    }

    private static IReadOnlyList<string> MethodsOf(RouteEndpoint endpoint) =>
        endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? [];

    private static string PathOf(RouteEndpoint endpoint) => "/" + endpoint.RoutePattern.RawText?.TrimStart('/');
}
