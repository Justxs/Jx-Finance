using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.BulkTagTransactions;

public sealed class BulkTagTransactionsValidator : Validator<BulkTagTransactionsRequest>
{
    public BulkTagTransactionsValidator()
    {
        RuleFor(r => r.TransactionIds).IsBulkSelection("tagged");
        RuleForEach(r => r.TransactionIds).IsRequired();
        RuleFor(r => r.TagIds).IsPresent().HasAtMostTags();
        RuleForEach(r => r.TagIds).IsRequired();
    }
}
