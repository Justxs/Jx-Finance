using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.UpdateTransaction;

public sealed class UpdateTransactionValidator : Validator<UpdateTransactionRequest>
{
    public UpdateTransactionValidator()
    {
        RuleFor(r => r.AccountId).NotEmpty();
        RuleFor(r => r.Amount)
            .IsPositiveMoney()
            .WithMessage("Amount must be a positive decimal with at most 2 decimal places.");
        RuleFor(r => r.Currency).IsInEnum();
        RuleFor(r => r.Date).NotEmpty();
        RuleFor(r => r.Description).MaximumLength(500);

        RuleForEach(r => r.Lines)
            .ChildRules(line =>
            {
                line.RuleFor(l => l.Amount)
                    .IsPositiveMoney()
                    .WithMessage("Each line's amount must be a positive decimal with at most 2 decimal places.");
                line.RuleFor(l => l.Description).MaximumLength(500);
            })
            .When(r => r.Lines is { Count: > 0 });

        RuleFor(r => r)
            .Must(r => r.Lines is not { Count: > 0 } || LinesSumMatchesTotal(r.Lines, r.Amount))
            .WithMessage("The split lines must add up to the transaction amount.")
            .WithName("Lines");
    }

    private static bool LinesSumMatchesTotal(IReadOnlyList<TransactionLineRequest> lines, decimal total) =>
        !DecimalRules.FitsMoney(total)
        || lines.Any(l => !DecimalRules.FitsMoney(l.Amount))
        || lines.Sum(l => l.Amount) == total;
}
