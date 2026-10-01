using FastEndpoints;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.TransactionGroups.AddToTransactionGroup;

public sealed class AddToTransactionGroupValidator : Validator<AddToTransactionGroupRequest>
{
    public AddToTransactionGroupValidator()
    {
        RuleFor(r => r.TransactionIds).IsBulkSelection("added to a group");
    }
}
