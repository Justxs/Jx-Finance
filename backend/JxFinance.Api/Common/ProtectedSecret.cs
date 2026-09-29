using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;

namespace JxFinance.Common;

public static class ProtectedSecret
{
    public static string Protect(this IDataProtectionProvider protection, string purpose, string secret) =>
        protection.CreateProtector(purpose).Protect(secret);

    public static string? TryUnprotect(this IDataProtectionProvider protection, string purpose, string protectedSecret)
    {
        try
        {
            return protection.CreateProtector(purpose).Unprotect(protectedSecret);
        }
        catch (CryptographicException)
        {
            return null;
        }
    }
}
