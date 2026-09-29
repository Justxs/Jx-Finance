using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication;

namespace JxFinance.Common.Middleware;

public sealed class PersonalApiTokenGateMiddleware(RequestDelegate next, IInstanceSettingsStore settings)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (!PersonalApiTokenFormat.IsBearerToken(context.Request.Headers.Authorization))
        {
            await next(context);
            return;
        }

        if (!context.User.HasClaim(claim => claim.Type == AuthClaims.TokenId))
        {
            await context.ChallengeAsync();
            return;
        }

        if (!settings.Current.IsEnabled(Feature.ApiTokens))
        {
            await ProblemResponses.WriteAsync(
                context,
                new DomainError(ErrorCodes.FeatureDisabled, $"The {Feature.ApiTokens} feature is turned off for this installation."));
            return;
        }

        if (!HttpMethods.IsGet(context.Request.Method) || !TokenReadable.Allows(context.GetEndpoint()?.Metadata))
        {
            await ProblemResponses.WriteAsync(
                context,
                new DomainError(ErrorCodes.TokenNotAllowed, "A personal API token can only read the ledger; this route needs a browser session."));
            return;
        }

        await next(context);
    }
}
