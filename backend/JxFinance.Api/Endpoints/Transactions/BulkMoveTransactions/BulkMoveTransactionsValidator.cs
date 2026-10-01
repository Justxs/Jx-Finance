using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.BulkMoveTransactions;

public sealed class BulkMoveTransactionsValidator : Validator<BulkMoveTransactionsRequest>
{
    public BulkMoveTransactionsValidator()
    {
        RuleFor(r => r.TransactionIds).IsBulkSelection("moved");
        RuleForEach(r => r.TransactionIds).IsRequired();
        RuleFor(r => r.AccountId).IsRequired();
    }
}
