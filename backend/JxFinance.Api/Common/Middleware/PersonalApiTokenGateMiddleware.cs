using JxFinance.Common.Errors;
using JxFinance.Common.Mcp;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication;

namespace JxFinance.Common.Middleware;

public sealed class PersonalApiTokenGateMiddleware(RequestDelegate next, IInstanceSettingsStore settings)
{
    public static readonly DomainError ReadOnlyToken = new(
        ErrorCodes.TokenNotAllowed,
        "This token can only read; create a read-and-write token to record entries.");

    public static readonly DomainError NotReadable = new(
        ErrorCodes.TokenNotAllowed,
        "A personal API token can only read the ledger; this route needs a browser session.");

    public static readonly DomainError NotWritable = new(
        ErrorCodes.TokenNotAllowed,
        "API tokens cannot use this route; it needs a browser session.");

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

        var canWrite = context.User.HasClaim(AuthClaims.TokenAccess, nameof(TokenAccess.ReadWrite));
        if (Refusal(context.Request.Method, canWrite, context.GetEndpoint()?.Metadata) is { } refusal)
        {
            await ProblemResponses.WriteAsync(context, refusal);
            return;
        }

        await next(context);
    }

    public static DomainError? Refusal(string method, bool canWrite, IEnumerable<object>? metadata)
    {
        if (metadata?.OfType<McpRoute>().Any() is true)
        {
            return null;
        }

        if (HttpMethods.IsGet(method))
        {
            return TokenReadable.Allows(metadata) ? null : NotReadable;
        }

        if (!TokenWritable.Allows(metadata))
        {
            return NotWritable;
        }

        return canWrite ? null : ReadOnlyToken;
    }
}
