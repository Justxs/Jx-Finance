using System.Security.Claims;
using FastEndpoints.Security;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.Auth;

public static class JwtCookieAuthentication
{
    public static IServiceCollection AddJwtCookieAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var signingKey = JwtSigningKey.Resolve(configuration);
        services.AddSingleton(signingKey);

        services.AddAuthenticationJwtBearer(
            signing => signing.SigningKey = signingKey.Value,
            bearer =>
            {
                bearer.TokenValidationParameters.ClockSkew = TimeSpan.Zero;
                bearer.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        context.Token = context.Request.Cookies[AuthCookies.AccessToken];
                        return Task.CompletedTask;
                    },
                    OnTokenValidated = ValidatePrincipalAsync,
                };
            });

        return services;
    }

    private static async Task ValidatePrincipalAsync(TokenValidatedContext context)
    {
        var principal = context.Principal;
        if (!Guid.TryParse(principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) || userId == Guid.Empty)
        {
            context.Fail("The token does not identify a user.");
            return;
        }

        var now = context.HttpContext.RequestServices.GetRequiredService<IClock>().UtcNow;
        var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
        var hasSessionId = Guid.TryParse(principal!.FindFirstValue(AuthClaims.SessionId), out var sessionId);
        var state = await SessionStateAsync(db, userId, sessionId, now, context.HttpContext.RequestAborted);

        if (state is null
            || state.SecurityStamp != principal.FindFirstValue(AuthClaims.SecurityStamp)
            || state.IsDeactivated)
        {
            context.Fail("The session is no longer valid.");
            return;
        }

        if (!hasSessionId || !state.HasLiveSession)
        {
            context.Fail("The session has ended.");
        }
    }

    public static Task<SessionState?> SessionStateAsync(
        AppDbContext db,
        Guid userId,
        Guid sessionId,
        DateTimeOffset now,
        CancellationToken cancellationToken) =>
        db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new SessionState(
                u.SecurityStamp,
                u.LockoutEnd != null && u.LockoutEnd >= AppUser.DeactivatedUntil,
                db.UserSessions.Any(s => s.Id == sessionId && s.UserId == userId && s.ExpiresAt > now)))
            .FirstOrDefaultAsync(cancellationToken);
}

public sealed record SessionState(string? SecurityStamp, bool IsDeactivated, bool HasLiveSession);
