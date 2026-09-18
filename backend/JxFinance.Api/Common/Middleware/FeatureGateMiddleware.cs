using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using Microsoft.AspNetCore.Mvc;

namespace JxFinance.Common.Middleware;

public sealed class FeatureGateMiddleware(RequestDelegate next, IInstanceSettingsStore settings)
{
    private const string ErrorCode = "feature_disabled";

    private const string EmptyWhenDisabled = "/api/households";

    private static readonly (string Prefix, Feature Feature)[] Gates =
    [
        ("/api/budgets", Feature.Budgets),
        ("/api/goals", Feature.Goals),
        ("/api/recurring-bills", Feature.RecurringBills),
        ("/api/networth", Feature.NetWorth),
        ("/api/assets", Feature.NetWorth),
        ("/api/debts", Feature.NetWorth),
        ("/api/reports", Feature.Reports),
        ("/api/import", Feature.Import),
        ("/api/households", Feature.Households),
        ("/api/conversions", Feature.MultiCurrency),
    ];

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path;
        foreach (var (prefix, feature) in Gates)
        {
            if (!path.StartsWithSegments(prefix, StringComparison.OrdinalIgnoreCase) || settings.Current.IsEnabled(feature))
            {
                continue;
            }

            if (HttpMethods.IsGet(context.Request.Method) && path.Equals(EmptyWhenDisabled, StringComparison.OrdinalIgnoreCase))
            {
                await context.Response.WriteAsJsonAsync(Array.Empty<object>(), context.RequestAborted);
                return;
            }

            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsJsonAsync(
                new ProblemDetails
                {
                    Status = StatusCodes.Status404NotFound,
                    Title = "Feature disabled",
                    Detail = $"The {feature} feature is turned off for this installation.",
                    Instance = path,
                    Extensions = { ["code"] = ErrorCode },
                },
                options: null,
                contentType: "application/problem+json",
                context.RequestAborted);
            return;
        }

        await next(context);
    }
}
