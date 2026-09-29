using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Auth.Passkeys;

public sealed class RenamePasskeyValidator : Validator<RenamePasskeyRequest>
{
    public RenamePasskeyValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(PasskeySite.NameMaxLength);
    }
}
