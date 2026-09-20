using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FastEndpoints;
using FastEndpoints.Security;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Auth.Interfaces;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Auth.Services;

[RegisterService<ISessionService>(LifeTime.Scoped)]
public sealed class SessionService(
    IHttpContextAccessor httpContextAccessor,
    UserManager<AppUser> userManager,
    AppDbContext db,
    JwtSigningKey signingKey,
    IConfiguration configuration,
    IClock clock) : ISessionService
{
    private static readonly TimeSpan AccessTokenLifetime = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan DefaultSessionLifetime = TimeSpan.FromDays(1);
    private static readonly TimeSpan RememberMeSessionLifetime = TimeSpan.FromDays(30);
    private static readonly TimeSpan RotationGrace = TimeSpan.FromSeconds(30);

    private HttpContext Http => httpContextAccessor.HttpContext
        ?? throw new InvalidOperationException("Sessions can only be managed during an HTTP request.");

    public async Task SignInAsync(AppUser user, bool rememberMe, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;
        await db.UserSessions
            .Where(s => s.UserId == user.Id && (s.ExpiresAt <= now || s.SecurityStamp != user.SecurityStamp))
            .ExecuteDeleteAsync(cancellationToken);

        var session = new UserSession
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            IsPersistent = rememberMe,
            CreatedAt = now,
            ExpiresAt = now.Add(rememberMe ? RememberMeSessionLifetime : DefaultSessionLifetime),
        };
        db.Add(session);
        await IssueAsync(session, user, cancellationToken);
    }

    public async Task<bool> RefreshAsync(CancellationToken cancellationToken)
    {
        if (!TryReadRefreshCookie(out var sessionId, out var secret))
        {
            ClearCookies();
            return false;
        }

        var session = await db.UserSessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);
        var isCurrent = session is not null && HashMatches(session.TokenHash, secret);
        var isPrevious = session?.PreviousTokenHash is { } previousHash && !isCurrent && HashMatches(previousHash, secret);
        if (session is null || (!isCurrent && !isPrevious))
        {
            ClearCookies();
            return false;
        }

        var now = clock.UtcNow;
        var user = await userManager.FindByIdAsync(session.UserId.ToString());
        if (session.ExpiresAt <= now
            || user is null
            || user.SecurityStamp != session.SecurityStamp
            || user.IsDeactivated
            || (isPrevious && (session.RotatedAt is not { } rotatedAt || now - rotatedAt > RotationGrace)))
        {
            await db.UserSessions.Where(s => s.Id == session.Id).ExecuteDeleteAsync(cancellationToken);
            ClearCookies();
            return false;
        }

        if (isPrevious)
        {
            await AppendAccessCookieAsync(session, user);
            return true;
        }

        var currentHash = session.TokenHash;
        var newSecret = NewSecret();
        var newHash = Hash(newSecret);
        var rotated = await db.UserSessions
            .Where(s => s.Id == session.Id && s.TokenHash == currentHash)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(s => s.TokenHash, newHash)
                    .SetProperty(s => s.PreviousTokenHash, currentHash)
                    .SetProperty(s => s.RotatedAt, now),
                cancellationToken);

        if (rotated == 0 && !await db.UserSessions.AnyAsync(s => s.Id == session.Id, cancellationToken))
        {
            ClearCookies();
            return false;
        }

        await AppendAccessCookieAsync(session, user);
        if (rotated == 1)
        {
            AppendRefreshCookie(session, newSecret);
        }

        return true;
    }

    public async Task RenewAsync(AppUser user, CancellationToken cancellationToken)
    {
        var session = Guid.TryParse(Http.User.FindFirstValue(AuthClaims.SessionId), out var sessionId)
            ? await db.UserSessions.FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == user.Id, cancellationToken)
            : null;
        if (session is null)
        {
            ClearCookies();
            return;
        }

        await IssueAsync(session, user, cancellationToken);
    }

    public async Task SignOutAsync(CancellationToken cancellationToken)
    {
        if (Guid.TryParse(Http.User.FindFirstValue(AuthClaims.SessionId), out var sessionId))
            await db.UserSessions.Where(s => s.Id == sessionId).ExecuteDeleteAsync(cancellationToken);

        ClearCookies();
    }

    private async Task IssueAsync(UserSession session, AppUser user, CancellationToken cancellationToken)
    {
        var secret = NewSecret();
        session.TokenHash = Hash(secret);
        session.PreviousTokenHash = null;
        session.RotatedAt = null;
        session.SecurityStamp = user.SecurityStamp ?? string.Empty;
        await db.SaveChangesAsync(cancellationToken);

        await AppendAccessCookieAsync(session, user);
        AppendRefreshCookie(session, secret);
    }

    private async Task AppendAccessCookieAsync(UserSession session, AppUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        var accessToken = JwtBearer.CreateToken(o =>
        {
            o.SigningKey = signingKey.Value;
            o.ExpireAt = clock.UtcNow.Add(AccessTokenLifetime).UtcDateTime;
            o.User.Roles.AddRange(roles);
            o.User.Claims.Add(new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()));
            o.User.Claims.Add(new Claim(AuthClaims.SessionId, session.Id.ToString()));
            o.User.Claims.Add(new Claim(AuthClaims.SecurityStamp, session.SecurityStamp));
        });

        Http.Response.Cookies.Append(AuthCookies.AccessToken, accessToken, CookieOptions(AuthCookies.AccessTokenPath, CookieExpiry(session)));
    }

    private void AppendRefreshCookie(UserSession session, string secret) =>
        Http.Response.Cookies.Append(
            AuthCookies.RefreshToken,
            $"{session.Id:N}.{secret}",
            CookieOptions(AuthCookies.RefreshTokenPath, CookieExpiry(session)));

    private static DateTimeOffset? CookieExpiry(UserSession session) => session.IsPersistent ? session.ExpiresAt : null;

    private static string NewSecret() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    private void ClearCookies()
    {
        Http.Response.Cookies.Delete(AuthCookies.AccessToken, CookieOptions(AuthCookies.AccessTokenPath, null));
        Http.Response.Cookies.Delete(AuthCookies.RefreshToken, CookieOptions(AuthCookies.RefreshTokenPath, null));
    }

    private CookieOptions CookieOptions(string path, DateTimeOffset? expires) => new()
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Strict,
        Secure = configuration.GetValue<bool>("App:SecureCookies") || Http.Request.IsHttps,
        Path = path,
        Expires = expires,
        IsEssential = true,
    };

    private bool TryReadRefreshCookie(out Guid sessionId, out string secret)
    {
        sessionId = Guid.Empty;
        secret = string.Empty;
        var parts = Http.Request.Cookies[AuthCookies.RefreshToken]?.Split('.', 2);
        if (parts is not { Length: 2 } || !Guid.TryParseExact(parts[0], "N", out sessionId))
            return false;

        secret = parts[1];
        return secret.Length > 0;
    }

    private static string Hash(string secret) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(secret)));

    private static bool HashMatches(string expectedHash, string secret) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expectedHash), Encoding.UTF8.GetBytes(Hash(secret)));
}
