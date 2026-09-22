using System.Security.Cryptography;
using JxFinance.Common;
using JxFinance.Infrastructure.Configuration;

namespace JxFinance.Infrastructure.Auth;

public sealed record JwtSigningKey(string Value)
{
    private const string FileName = "jwt-signing.key";

    public static JwtSigningKey Resolve(IConfiguration configuration)
    {
        var configured = configuration[ConfigKeys.JwtSigningKey];
        if (!string.IsNullOrWhiteSpace(configured))
            return new JwtSigningKey(configured);

        var directory = configuration[ConfigKeys.DataProtectionDirectory];
        if (string.IsNullOrWhiteSpace(directory))
            return new JwtSigningKey(Generate());

        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, FileName);
        var stored = File.Exists(path) ? File.ReadAllText(path).Trim() : string.Empty;
        if (stored.Length == 0)
        {
            stored = Generate();
            File.WriteAllText(path, stored);
        }

        return new JwtSigningKey(stored);
    }

    public override string ToString() => $"{nameof(JwtSigningKey)} {{ Value = {SecretText.Hidden} }}";

    private static string Generate() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
}
