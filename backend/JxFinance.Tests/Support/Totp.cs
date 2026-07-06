using System.Security.Cryptography;

namespace JxFinance.Tests.Support;

public static class Totp
{
    public static string GenerateCode(string base32Secret, DateTimeOffset? at = null)
    {
        var secretBytes = Base32Decode(base32Secret);
        var counter = (long)((at ?? DateTimeOffset.UtcNow).ToUnixTimeSeconds() / 30);

        var counterBytes = BitConverter.GetBytes(counter);
        if (BitConverter.IsLittleEndian)
        {
            Array.Reverse(counterBytes);
        }

        using var hmac = new HMACSHA1(secretBytes);
        var hash = hmac.ComputeHash(counterBytes);

        var offset = hash[^1] & 0xF;
        var binary =
            ((hash[offset] & 0x7f) << 24)
            | ((hash[offset + 1] & 0xff) << 16)
            | ((hash[offset + 2] & 0xff) << 8)
            | (hash[offset + 3] & 0xff);

        var code = binary % 1_000_000;
        return code.ToString("D6");
    }

    private static byte[] Base32Decode(string input)
    {
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var cleaned = input.TrimEnd('=').ToUpperInvariant();

        var bits = 0;
        var value = 0;
        var output = new List<byte>();

        foreach (var c in cleaned)
        {
            var index = alphabet.IndexOf(c);
            if (index < 0)
            {
                continue;
            }

            value = (value << 5) | index;
            bits += 5;

            if (bits >= 8)
            {
                output.Add((byte)((value >> (bits - 8)) & 0xFF));
                bits -= 8;
            }
        }

        return output.ToArray();
    }
}
