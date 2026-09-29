using JxFinance.Common;
using JxFinance.Infrastructure.Configuration;

namespace JxFinance.Infrastructure.Auth;

public static class AuthCookies
{
    public const string AccessToken = "jx_access";
    public const string AccessTokenPath = ApiRoutes.Base;
    public const string RefreshToken = "jx_refresh";
    public const string RefreshTokenPath = ApiRoutes.AuthPath + "/refresh";
    public const string PasskeyState = "jx_passkey";
    public const string PasskeyStatePath = ApiRoutes.AuthPath + "/passkeys";

    public static CookieOptions Options(HttpContext http, IConfiguration configuration, string path, DateTimeOffset? expires) => new()
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Strict,
        Secure = configuration.GetValue<bool>(ConfigKeys.SecureCookies) || http.Request.IsHttps,
        Path = path,
        Expires = expires,
        IsEssential = true,
    };
}
