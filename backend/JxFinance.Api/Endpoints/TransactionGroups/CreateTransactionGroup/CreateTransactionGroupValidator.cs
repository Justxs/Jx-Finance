using FastEndpoints;
using JxFinance.Common.Sharing;
using JxFinance.Endpoints.TransactionGroups.Shared;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.TransactionGroups.CreateTransactionGroup;

public sealed class CreateTransactionGroupValidator : Validator<CreateTransactionGroupRequest>
{
    public CreateTransactionGroupValidator()
    {
        RuleFor(r => r.Name).IsGroupName();
        RuleFor(r => r.HouseholdId).RequiresHouseholdWhenShared("group");
        RuleFor(r => r.TransactionIds).IsBulkSelection("grouped");
    }
}
