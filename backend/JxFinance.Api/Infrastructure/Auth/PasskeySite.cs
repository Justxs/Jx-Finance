using Microsoft.AspNetCore.Identity;

namespace JxFinance.Infrastructure.Auth;

public static class PasskeySite
{
    public const int MaxPasskeysPerUser = 10;
    public const int NameMaxLength = 100;
    public const int CredentialJsonMaxLength = 64 * 1024;

    public static bool IsAvailable(string siteUrl) =>
        string.IsNullOrWhiteSpace(siteUrl)
        || (Origin(siteUrl) is { } origin && origin.Scheme == Uri.UriSchemeHttps && origin.HostNameType == UriHostNameType.Dns);

    public static void Configure(IdentityPasskeyOptions options, string siteUrl)
    {
        options.UserVerificationRequirement = "required";
        options.ResidentKeyRequirement = "required";
        options.AttestationConveyancePreference = "none";
        options.AuthenticatorTimeout = TimeSpan.FromMinutes(2);

        if (Origin(siteUrl) is not { } origin)
        {
            return;
        }

        var expected = origin.GetLeftPart(UriPartial.Authority);
        options.ServerDomain = origin.IdnHost;
        options.ValidateOrigin = context => ValueTask.FromResult(
            !context.CrossOrigin && string.Equals(context.Origin, expected, StringComparison.OrdinalIgnoreCase));
    }

    private static Uri? Origin(string siteUrl) =>
        Uri.TryCreate(siteUrl.Trim(), UriKind.Absolute, out var origin) ? origin : null;
}
