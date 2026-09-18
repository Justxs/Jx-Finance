using FastEndpoints;
using FluentValidation;

namespace JxFinance.Endpoints.Transactions.BulkCategorizeTransactions;

public sealed class BulkCategorizeTransactionsValidator : Validator<BulkCategorizeTransactionsRequest>
{
    public const int MaxTransactions = 200;

    public BulkCategorizeTransactionsValidator()
    {
        RuleFor(r => r.TransactionIds)
            .NotEmpty()
            .Must(ids => ids is null || ids.Count <= MaxTransactions)
            .WithMessage($"At most {MaxTransactions} transactions can be recategorized at once.");
        RuleForEach(r => r.TransactionIds).NotEmpty();
    }
}
