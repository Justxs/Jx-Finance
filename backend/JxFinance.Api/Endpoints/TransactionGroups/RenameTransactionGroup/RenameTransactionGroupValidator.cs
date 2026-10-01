using FastEndpoints;
using JxFinance.Common.Sharing;
using JxFinance.Endpoints.TransactionGroups.Shared;

namespace JxFinance.Endpoints.TransactionGroups.RenameTransactionGroup;

public sealed class RenameTransactionGroupValidator : Validator<RenameTransactionGroupRequest>
{
    public RenameTransactionGroupValidator()
    {
        RuleFor(r => r.Name).IsGroupName();
        RuleFor(r => r.HouseholdId).RequiresHouseholdWhenShared("group");
    }
}
