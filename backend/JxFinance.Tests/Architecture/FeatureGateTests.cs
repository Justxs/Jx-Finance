using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace JxFinance.Tests.Architecture;

[Collection<FastEndpointsPipeline>]
public sealed class FeatureGateTests
{
    private static readonly (string Prefix, Feature Feature)[] GatedPrefixes =
    [
        (ApiRoutes.BudgetsPath, Feature.Budgets),
        (ApiRoutes.GoalsPath, Feature.Goals),
        (ApiRoutes.RecurringBillsPath, Feature.RecurringBills),
        (ApiRoutes.NetWorthPath, Feature.NetWorth),
        (ApiRoutes.AssetsPath, Feature.NetWorth),
        (ApiRoutes.DebtsPath, Feature.NetWorth),
        (ApiRoutes.ReportsPath, Feature.Reports),
        (ApiRoutes.ImportPath, Feature.Import),
        (ApiRoutes.HouseholdsPath, Feature.Households),
        (ApiRoutes.ConversionsPath, Feature.MultiCurrency),
        (ApiRoutes.InvestmentsPath, Feature.Investments),
        (ApiRoutes.CategorizationRulesPath, Feature.CategorizationRules),
    ];

    [Fact]
    public void Every_endpoint_requires_exactly_the_feature_of_its_route_prefix()
    {
        Assert.Contains(FastEndpointsPipeline.Endpoints, endpoint => endpoint.Metadata.GetMetadata<RequiresFeature>() is null);

        var mismatches = FastEndpointsPipeline.Endpoints
            .Select(endpoint => (Route: Describe(endpoint), Expected: ExpectedFeature(endpoint), Actual: endpoint.Metadata.GetMetadata<RequiresFeature>()?.Feature))
            .Where(entry => entry.Expected != entry.Actual)
            .Select(entry => $"{entry.Route}: expected {entry.Expected?.ToString() ?? "none"}, found {entry.Actual?.ToString() ?? "none"}")
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.True(mismatches.Count == 0, string.Join(Environment.NewLine, mismatches));
    }

    [Fact]
    public void Every_gated_prefix_still_owns_endpoints()
    {
        var empty = GatedPrefixes
            .Where(gate => !FastEndpointsPipeline.Endpoints.Any(endpoint => IsUnder(PathOf(endpoint), gate.Prefix)))
            .Select(gate => gate.Prefix)
            .ToList();

        Assert.Empty(empty);
    }

    private static Feature? ExpectedFeature(RouteEndpoint endpoint)
    {
        var path = PathOf(endpoint);
        return GatedPrefixes.Where(gate => IsUnder(path, gate.Prefix)).Select(gate => (Feature?)gate.Feature).SingleOrDefault();
    }

    private static PathString PathOf(RouteEndpoint endpoint) => new("/" + endpoint.RoutePattern.RawText?.TrimStart('/'));

    private static bool IsUnder(PathString path, string prefix) => path.StartsWithSegments(prefix, StringComparison.OrdinalIgnoreCase);

    private static string Describe(RouteEndpoint endpoint)
    {
        var methods = endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? [];
        return $"{string.Join(",", methods)} /{endpoint.RoutePattern.RawText?.TrimStart('/')}";
    }
}
