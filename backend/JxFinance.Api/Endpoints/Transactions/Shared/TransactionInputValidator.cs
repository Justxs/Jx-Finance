using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.Transactions.Shared;

public abstract class TransactionInputValidator<TRequest> : Validator<TRequest>
    where TRequest : ITransactionInput
{
    protected TransactionInputValidator()
    {
        RuleFor(r => r.AccountId).IsRequired();
        RuleFor(r => r.Amount)
            .IsPositiveMoney()
            .WithMessage("Amount must be a positive decimal with at most 2 decimal places.")
            .When(r => r.Type != FlowType.Expense);
        RuleFor(r => r.Amount)
            .IsNonZeroMoney()
            .WithMessage("An expense amount must be a non-zero decimal with at most 2 decimal places; a negative amount is a refund.")
            .When(r => r.Type == FlowType.Expense);
        RuleFor(r => r.Currency).IsKnownEnum();
        RuleFor(r => r.Date).IsRequired();
        RuleFor(r => r.Description).HasMaxLength(500);
        RuleFor(r => r.Note).HasMaxLength(TransactionNote.MaxLength);
        RuleFor(r => r.TagIds).HasAtMostTags();
        RuleForEach(r => r.TagIds).IsRequired();
        RuleFor(r => r.Lines)
            .Must(lines => lines is not { Count: > 0 })
            .WithErrorCode(ErrorCodes.TransactionSplitNotAllowed)
            .WithMessage("A refund cannot be split.")
            .When(r => r.Amount < 0);
        RuleFor(r => r.RefundOfTransactionId)
            .Null()
            .WithErrorCode(ErrorCodes.TransactionRefundOriginalInvalid)
            .WithMessage("Only a refund, an expense with a negative amount, can name the purchase it refunds.")
            .When(r => r.Type != FlowType.Expense || r.Amount >= 0);

        RuleForEach(r => r.Lines)
            .ChildRules(line =>
            {
                line.RuleFor(l => l.Amount)
                    .IsPositiveMoney()
                    .WithMessage("Each line's amount must be a positive decimal with at most 2 decimal places.");
                line.RuleFor(l => l.Description).HasMaxLength(500);
            })
            .When(r => r.Lines is { Count: > 0 } && r.Amount >= 0);

        RuleFor(r => r)
            .Must(r => r.Lines is not { Count: > 0 } || LinesSumMatchesTotal(r.Lines, r.Amount))
            .WithErrorCode(ErrorCodes.TransactionLinesMismatch)
            .WithMessage("The split lines must add up to the transaction amount.")
            .WithName("Lines")
            .When(r => r.Amount >= 0);
    }

    private static bool LinesSumMatchesTotal(IReadOnlyList<TransactionLineRequest> lines, decimal total) =>
        !DecimalRules.FitsMoney(total)
        || lines.Any(l => !DecimalRules.FitsMoney(l.Amount))
        || lines.Sum(l => l.Amount) == total;
}
