using System.Security.Claims;
using System.Text.Encodings.Web;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Serilog;

namespace JxFinance.Infrastructure.Auth;

public sealed class PersonalApiTokenAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    AppDbContext db,
    IClock clock,
    IDiagnosticContext diagnostics) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "PersonalApiToken";

    public const string LogProperty = "TokenPrefix";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!PersonalApiTokenFormat.TryParse(Request.Headers.Authorization, out var prefix, out var secret))
        {
            return AuthenticateResult.Fail("The personal API token is malformed.");
        }

        diagnostics.Set(LogProperty, prefix);
        var now = clock.UtcNow;
        var token = await db.PersonalApiTokens
            .AsNoTracking()
            .Where(t => t.Prefix == prefix
                && t.ExpiresAt > now
                && db.Users.Where(AppUser.IsNotDeactivated).Any(u => u.Id == t.UserId))
            .Select(t => new { t.Id, t.UserId, t.Name, t.Access, t.SecretHash, t.LastUsedAt })
            .FirstOrDefaultAsync(CancellationToken.None);
        if (token is null || !SecretHash.Matches(token.SecretHash, secret))
        {
            return AuthenticateResult.Fail("The personal API token is unknown, expired or revoked.");
        }

        var staleBefore = now - PersonalApiToken.LastUsedPrecision;
        if (token.LastUsedAt is null || token.LastUsedAt < staleBefore)
        {
            await db.PersonalApiTokens
                .Where(t => t.Id == token.Id && (t.LastUsedAt == null || t.LastUsedAt < staleBefore))
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.LastUsedAt, now), CancellationToken.None);
        }

        var identity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, token.UserId.ToString()),
                new Claim(AuthClaims.TokenId, token.Id.ToString()),
                new Claim(AuthClaims.TokenName, token.Name),
                new Claim(AuthClaims.TokenAccess, token.Access.ToString()),
            ],
            SchemeName);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName));
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.Headers.WWWAuthenticate = "Bearer error=\"invalid_token\"";
        return ProblemResponses.WriteAsync(
            Context,
            new DomainError(ErrorCodes.TokenInvalid, "The personal API token is missing, malformed, unknown, expired or revoked."));
    }
}
