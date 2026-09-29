using System.Security.Cryptography;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using Microsoft.AspNetCore.DataProtection;

namespace JxFinance.Common.Receipts;

public static class ReceiptApiKey
{
    public const string ProtectorPurpose = "JxFinance.Receipts.ApiKey";

    public static string Protect(IDataProtectionProvider protection, string apiKey) =>
        protection.CreateProtector(ProtectorPurpose).Protect(apiKey);

    public static Result<string> Unprotect(IDataProtectionProvider protection, ReceiptSettingsSnapshot settings)
    {
        if (!settings.HasKey)
        {
            return Result<string>.Failure(ErrorCodes.ReceiptNotConfigured, "Receipt reading has no API key yet.");
        }

        try
        {
            return protection.CreateProtector(ProtectorPurpose).Unprotect(settings.ProtectedApiKey);
        }
        catch (CryptographicException)
        {
            return Result<string>.Failure(
                ErrorCodes.ReceiptKeyUnreadable,
                "The stored Anthropic API key can no longer be read. Enter it again.");
        }
    }
}
