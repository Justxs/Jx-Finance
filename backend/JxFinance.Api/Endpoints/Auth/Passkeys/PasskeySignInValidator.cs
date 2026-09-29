using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class PasskeySignInValidator : Validator<PasskeySignInRequest>
{
    public PasskeySignInValidator()
    {
        RuleFor(r => r.CredentialJson).IsRequired().HasMaxLength(PasskeySite.CredentialJsonMaxLength);
    }
}
