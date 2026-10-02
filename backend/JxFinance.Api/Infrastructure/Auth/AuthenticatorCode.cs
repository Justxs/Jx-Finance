using System.Globalization;
using Microsoft.AspNetCore.Identity;

namespace JxFinance.Infrastructure.Auth;

public static class AuthenticatorCode
{
    private const string LoginProvider = "[JxFinance]";
    private const string LastAcceptedName = "LastAuthenticatorCode";

    private static readonly TimeSpan ReplayWindow = TimeSpan.FromMinutes(3);

    public static async Task<bool> ConsumeAsync(UserManager<AppUser> users, AppUser user, string code, DateTimeOffset now)
    {
        if (!int.TryParse(code, NumberStyles.Integer, CultureInfo.InvariantCulture, out var number)
            || !await users.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, code))
        {
            return false;
        }

        var normalized = number.ToString(CultureInfo.InvariantCulture);
        if (await users.GetAuthenticationTokenAsync(user, LoginProvider, LastAcceptedName) is { } last
            && last.Split(':') is [var seconds, var hash]
            && long.TryParse(seconds, CultureInfo.InvariantCulture, out var acceptedAt)
            && now - DateTimeOffset.FromUnixTimeSeconds(acceptedAt) < ReplayWindow
            && SecretHash.Matches(hash, normalized))
        {
            return false;
        }

        await users.SetAuthenticationTokenAsync(
            user,
            LoginProvider,
            LastAcceptedName,
            $"{now.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture)}:{SecretHash.Of(normalized)}");
        return true;
    }
}
