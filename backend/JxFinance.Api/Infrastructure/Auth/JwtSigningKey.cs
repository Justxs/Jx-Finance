using System.Security.Cryptography;

namespace JxFinance.Infrastructure.Auth;

public sealed record JwtSigningKey(string Value)
{
    private const string FileName = "jwt-signing.key";

    public static JwtSigningKey Resolve(IConfiguration configuration)
    {
        var configured = configuration["App:Jwt:SigningKey"];
        if (!string.IsNullOrWhiteSpace(configured))
            return new JwtSigningKey(configured);

        var directory = configuration["App:DataProtectionDirectory"];
        if (string.IsNullOrWhiteSpace(directory))
            return new JwtSigningKey(Generate());

        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory, FileName);
        if (!File.Exists(path))
            File.WriteAllText(path, Generate());

        return new JwtSigningKey(File.ReadAllText(path).Trim());
    }

    private static string Generate() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
}
