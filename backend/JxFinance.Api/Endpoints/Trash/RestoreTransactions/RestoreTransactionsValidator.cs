using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Trash.RestoreTransactions;

public sealed class RestoreTransactionsValidator : Validator<RestoreTransactionsRequest>
{
    public RestoreTransactionsValidator()
    {
        RuleFor(r => r.TransactionIds).IsBulkSelection("restored");
        RuleForEach(r => r.TransactionIds).IsRequired();
    }
}
