using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.BulkDeleteTransactions;

public sealed class BulkDeleteTransactionsValidator : Validator<BulkDeleteTransactionsRequest>
{
    public BulkDeleteTransactionsValidator()
    {
        RuleFor(r => r.TransactionIds).IsBulkSelection("deleted");
        RuleForEach(r => r.TransactionIds).IsRequired();
    }
}
