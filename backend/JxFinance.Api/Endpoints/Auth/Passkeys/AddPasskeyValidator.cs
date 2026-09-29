using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class AddPasskeyValidator : Validator<AddPasskeyRequest>
{
    public AddPasskeyValidator()
    {
        RuleFor(r => r.CredentialJson).IsRequired().HasMaxLength(PasskeySite.CredentialJsonMaxLength);
        RuleFor(r => r.Name).IsRequired().HasMaxLength(PasskeySite.NameMaxLength);
    }
}
