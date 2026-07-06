using FastEndpoints;
using FluentValidation;
using JxFinance.Common;
using JxFinance.Endpoints.Transactions;

namespace JxFinance.Endpoints.Transactions.UpdateTransaction;

public sealed class UpdateTransactionValidator : Validator<UpdateTransactionRequest>
{
    public UpdateTransactionValidator()
    {
        RuleFor(r => r.AccountId).NotEmpty();
        RuleFor(r => r.Amount)
            .Must(amount => MoneyWire.IsValid(amount) && MoneyWire.Parse(amount!).Amount > 0)
            .WithMessage("Amount must be a positive decimal with at most 2 decimal places.");
        RuleFor(r => r.Date).NotEmpty();
        RuleFor(r => r.Description).MaximumLength(500);

        RuleForEach(r => r.Lines)
            .ChildRules(line =>
            {
                line.RuleFor(l => l.Amount)
                    .Must(amount => MoneyWire.IsValid(amount) && MoneyWire.Parse(amount).Amount > 0)
                    .WithMessage("Each line's amount must be a positive decimal with at most 2 decimal places.");
                line.RuleFor(l => l.Description).MaximumLength(500);
            })
            .When(r => r.Lines is { Count: > 0 });

        RuleFor(r => r)
            .Must(r => r.Lines is not { Count: > 0 } || LinesSumMatchesTotal(r.Lines, r.Amount))
            .WithMessage("The split lines must add up to the transaction amount.")
            .WithName("Lines");
    }

    private static bool LinesSumMatchesTotal(IReadOnlyList<TransactionLineRequest> lines, string total)
    {
        if (!MoneyWire.IsValid(total) || lines.Any(l => !MoneyWire.IsValid(l.Amount)))
        {
            return true;
        }

        var sum = lines.Sum(l => MoneyWire.Parse(l.Amount).Amount);
        return sum == MoneyWire.Parse(total).Amount;
    }
}
