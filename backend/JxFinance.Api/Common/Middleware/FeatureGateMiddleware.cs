using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;

namespace JxFinance.Common.Middleware;

public sealed class FeatureGateMiddleware(RequestDelegate next, IInstanceSettingsStore settings)
{
    private const string EmptyWhenDisabled = ApiRoutes.HouseholdsPath;

    public async Task InvokeAsync(HttpContext context)
    {
        var feature = context.GetEndpoint()?.Metadata.GetMetadata<RequiresFeature>()?.Feature;
        if (feature is not { } gated || settings.Current.IsEnabled(gated))
        {
            await next(context);
            return;
        }

        if (HttpMethods.IsGet(context.Request.Method) && context.Request.Path.Equals(EmptyWhenDisabled, StringComparison.OrdinalIgnoreCase))
        {
            await context.Response.WriteAsJsonAsync(Array.Empty<object>(), context.RequestAborted);
            return;
        }

        await ProblemResponses.WriteAsync(
            context,
            new DomainError(ErrorCodes.FeatureDisabled, $"The {gated} feature is turned off for this installation."));
    }
}
