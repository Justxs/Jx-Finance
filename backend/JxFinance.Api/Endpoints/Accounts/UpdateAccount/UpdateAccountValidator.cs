using JxFinance.Common.Validation;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.UpdateAccount;

public sealed class UpdateAccountValidator : AccountInputValidator<UpdateAccountRequest>
{
    public UpdateAccountValidator()
    {
        RuleFor(r => r.Version).IsReadVersion();
    }
}
