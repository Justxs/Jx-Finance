using JxFinance.Common;

namespace JxFinance.Infrastructure.Auth;

public static class AuthCookies
{
    public const string AccessToken = "jx_access";
    public const string AccessTokenPath = ApiRoutes.Base;
    public const string RefreshToken = "jx_refresh";
    public const string RefreshTokenPath = ApiRoutes.AuthPath + "/refresh";
}
