using JxFinance.Domain.Common;
using Microsoft.AspNetCore.Identity;

namespace JxFinance.Common.Errors;

public static class IdentityResultExtensions
{
    private const string PasswordPrefix = "Password";

    public static DomainError ToDomainError(this IdentityResult result)
    {
        var codes = result.Errors.Select(error => error.Code).ToList();
        return new DomainError(CodeFor(codes), string.Join("; ", result.Errors.Select(error => error.Description)));
    }

    private static string CodeFor(List<string> codes)
    {
        if (codes.Any(code => code is nameof(IdentityErrorDescriber.DuplicateEmail) or nameof(IdentityErrorDescriber.DuplicateUserName)))
        {
            return ErrorCodes.EmailTaken;
        }

        if (codes.Contains(nameof(IdentityErrorDescriber.PasswordMismatch)))
        {
            return ErrorCodes.PasswordIncorrect;
        }

        if (codes.Any(code => code.StartsWith(PasswordPrefix, StringComparison.Ordinal)))
        {
            return ErrorCodes.PasswordTooWeak;
        }

        return codes.Any(code => code is nameof(IdentityErrorDescriber.InvalidEmail) or nameof(IdentityErrorDescriber.InvalidUserName))
            ? ErrorCodes.EmailInvalid
            : ErrorCodes.RequestInvalid;
    }
}
