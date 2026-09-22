using System.Net.Mime;
using JxFinance.Common.Errors;
using JxFinance.Common.OpenApi;
using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using Microsoft.AspNetCore.Mvc;

namespace JxFinance.Common.Middleware;

public sealed class FeatureGateMiddleware(RequestDelegate next, IInstanceSettingsStore settings)
{
    private const string EmptyWhenDisabled = ApiRoutes.HouseholdsPath;

    private static readonly (string Prefix, Feature Feature)[] Gates =
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
                    Extensions = { [ErrorContract.CodeProperty] = ErrorCodes.FeatureDisabled },
                },
                options: null,
                contentType: MediaTypeNames.Application.ProblemJson,
                context.RequestAborted);
            return;
        }

        await next(context);
    }
}
