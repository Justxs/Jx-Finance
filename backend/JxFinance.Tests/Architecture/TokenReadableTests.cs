using JxFinance.Common;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace JxFinance.Tests.Architecture;

[Collection<FastEndpointsPipeline>]
public sealed class TokenReadableTests
{
    private static readonly string[] ReadableRoutes =
    [
        "GET /api/accounts",
        "GET /api/accounts/archived",
        "GET /api/accounts/forecast",
        "GET /api/accounts/{id}",
        "GET /api/accounts/{id}/reconciliations",
        "GET /api/accounts/{id}/reconciliations/preview",
        "GET /api/assets",
        "GET /api/assets/{id}/valuations",
        "GET /api/assets/{id}/value-history",
        "GET /api/budgets",
        "GET /api/budgets/suggestions",
        "GET /api/categories",
        "GET /api/conversions",
        "GET /api/currencies",
        "GET /api/dashboard/category-breakdown",
        "GET /api/dashboard/monthly-trend",
        "GET /api/dashboard/summary",
        "GET /api/debts",
        "GET /api/debts/{id}/payment-candidates",
        "GET /api/debts/{id}/payments",
        "GET /api/debts/{id}/schedule",
        "GET /api/exchange-rates",
        "GET /api/goals",
        "GET /api/households",
        "GET /api/households/{id}",
        "GET /api/households/{id}/audit",
        "GET /api/households/{id}/settle-up",
        "GET /api/households/{id}/settlements",
        "GET /api/households/{id}/shared-expenses",
        "GET /api/investments/portfolio",
        "GET /api/investments/securities",
        "GET /api/investments/securities/{id:guid}/prices",
        "GET /api/investments/tax-summary",
        "GET /api/investments/tax-summary/export",
        "GET /api/investments/transactions",
        "GET /api/investments/value-history",
        "GET /api/networth",
        "GET /api/networth/history",
        "GET /api/payees",
        "GET /api/ping",
        "GET /api/recurring-bills",
        "GET /api/recurring-bills/calendar",
        "GET /api/recurring-bills/suggestions",
        "GET /api/recurring-bills/{id}",
        "GET /api/reports/summary",
        "GET /api/tags",
        "GET /api/transaction-groups",
        "GET /api/transaction-groups/{id}/members",
        "GET /api/transactions",
        "GET /api/transactions/export",
        "GET /api/transactions/export/pdf",
        "GET /api/transactions/ledger",
        "GET /api/transactions/places",
        "GET /api/transactions/summary",
        "GET /api/transactions/uncategorized-suggestions",
        "GET /api/transactions/{id}",
        "GET /api/transfers",
    ];

    internal static readonly string[] NeverReadablePrefixes =
    [
        ApiRoutes.AuthPath,
        ApiRoutes.UsersPath,
        ApiRoutes.Base + "/" + ApiRoutes.Settings,
        ApiRoutes.BackupsPath,
        ApiRoutes.Base + "/" + ApiRoutes.Notifications,
        ApiRoutes.Base + "/" + ApiRoutes.Trash,
        ApiRoutes.ImportPath,
        ApiRoutes.AttachmentsPath,
        ApiRoutes.ReceiptsPath,
        ApiRoutes.MonthClosePath,
        ApiRoutes.CategorizationRulesPath,
        ApiRoutes.Base + "/" + ApiRoutes.Setup,
        ApiRoutes.InvestmentsPath + "/connections",
    ];

    [Fact]
    public void Exactly_the_approved_read_routes_accept_a_personal_api_token()
    {
        var readable = FastEndpointsPipeline.Endpoints
            .Where(IsReadable)
            .Select(endpoint => $"{HttpMethods.Get} {PathOf(endpoint)}")
            .Order(StringComparer.Ordinal)
            .ToList();

        Assert.Equal(ReadableRoutes.Order(StringComparer.Ordinal), readable);
    }

    [Fact]
    public void No_endpoint_under_a_private_prefix_is_token_readable()
    {
        var leaked = FastEndpointsPipeline.Endpoints
            .Where(endpoint => IsReadable(endpoint)
                && NeverReadablePrefixes.Any(prefix => new PathString(PathOf(endpoint)).StartsWithSegments(prefix, StringComparison.OrdinalIgnoreCase)))
            .Select(PathOf)
            .ToList();

        Assert.Empty(leaked);
        Assert.Contains(FastEndpointsPipeline.Endpoints, endpoint => PathOf(endpoint) == ApiRoutes.InvestmentsPath + "/connections");
    }

    private static bool IsReadable(RouteEndpoint endpoint) =>
        TokenReadable.Allows(endpoint.Metadata)
        && endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods.Contains(HttpMethods.Get) is true;

    private static string PathOf(RouteEndpoint endpoint) => "/" + endpoint.RoutePattern.RawText?.TrimStart('/');
}
