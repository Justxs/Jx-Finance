using System.Security.Cryptography;
using JxFinance.Common;
using Microsoft.AspNetCore.WebUtilities;

namespace JxFinance.Infrastructure.Auth;

public static class PersonalApiTokenFormat
{
    public const string Marker = "jxp_";
    public const int PrefixLength = 8;
    public const int HashLength = 64;

    private const string BearerMarker = "Bearer " + Marker;
    private const string PrefixAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static readonly int SecretStart = Marker.Length + PrefixLength + 1;
    private static readonly int SecretLength = WebEncoders.Base64UrlEncode(new byte[SecretHash.SecretBytes]).Length;

    public static bool IsBearerToken(string? authorization) =>
        authorization is not null && authorization.StartsWith(BearerMarker, StringComparison.OrdinalIgnoreCase);

    public static IssuedToken Issue()
    {
        var prefix = RandomNumberGenerator.GetString(PrefixAlphabet, PrefixLength);
        var secret = SecretHash.NewSecret();
        return new IssuedToken(prefix, SecretHash.Of(secret), $"{Marker}{prefix}_{secret}");
    }

    public static bool TryParse(string? authorization, out string prefix, out string secret)
    {
        prefix = string.Empty;
        secret = string.Empty;
        if (!IsBearerToken(authorization))
        {
            return false;
        }

        var token = authorization!["Bearer ".Length..];
        if (!token.StartsWith(Marker, StringComparison.Ordinal)
            || token.Length != SecretStart + SecretLength
            || token[SecretStart - 1] != '_')
        {
            return false;
        }

        var candidatePrefix = token[Marker.Length..(SecretStart - 1)];
        var candidateSecret = token[SecretStart..];
        if (!candidatePrefix.All(PrefixAlphabet.Contains) || !IsSecret(candidateSecret))
        {
            return false;
        }

        prefix = candidatePrefix;
        secret = candidateSecret;
        return true;
    }

    private static bool IsSecret(string candidate)
    {
        try
        {
            var bytes = WebEncoders.Base64UrlDecode(candidate);
            return bytes.Length == SecretHash.SecretBytes && WebEncoders.Base64UrlEncode(bytes) == candidate;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}

public sealed record IssuedToken(string Prefix, string SecretHash, string Token)
{
    public override string ToString() => $"{nameof(IssuedToken)} {{ Prefix = {Prefix}, Token = {SecretText.Hidden} }}";
}
