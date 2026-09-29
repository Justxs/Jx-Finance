using System.Security.Cryptography;
using System.Text;
using JxFinance.Common;
using Microsoft.AspNetCore.WebUtilities;

namespace JxFinance.Infrastructure.Auth;

public static class PersonalApiTokenFormat
{
    public const string Marker = "jxp_";
    public const int PrefixLength = 8;
    public const int HashLength = 64;

    private const string BearerMarker = "Bearer " + Marker;
    private const int SecretBytes = 32;
    private const string PrefixAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static readonly int SecretStart = Marker.Length + PrefixLength + 1;
    private static readonly int SecretLength = WebEncoders.Base64UrlEncode(new byte[SecretBytes]).Length;

    public static bool IsBearerToken(string? authorization) =>
        authorization is not null && authorization.StartsWith(BearerMarker, StringComparison.OrdinalIgnoreCase);

    public static IssuedToken Issue()
    {
        var prefix = RandomNumberGenerator.GetString(PrefixAlphabet, PrefixLength);
        var secret = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(SecretBytes));
        return new IssuedToken(prefix, Hash(secret), $"{Marker}{prefix}_{secret}");
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

    public static bool HashMatches(string expectedHash, string secret) =>
        CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expectedHash), Encoding.UTF8.GetBytes(Hash(secret)));

    private static string Hash(string secret) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(secret)));

    private static bool IsSecret(string candidate)
    {
        try
        {
            var bytes = WebEncoders.Base64UrlDecode(candidate);
            return bytes.Length == SecretBytes && WebEncoders.Base64UrlEncode(bytes) == candidate;
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
