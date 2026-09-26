using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.BulkCategorizeTransactions;

public sealed class BulkCategorizeTransactionsValidator : Validator<BulkCategorizeTransactionsRequest>
{
    public BulkCategorizeTransactionsValidator()
    {
        RuleFor(r => r.TransactionIds).IsBulkSelection("recategorized");
        RuleForEach(r => r.TransactionIds).IsRequired();
    }
}
