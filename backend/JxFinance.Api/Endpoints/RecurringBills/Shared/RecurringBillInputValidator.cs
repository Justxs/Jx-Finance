using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.Shared;

public abstract class RecurringBillInputValidator<TRequest> : Validator<TRequest>
    where TRequest : IRecurringBillInput
{
    protected RecurringBillInputValidator()
    {
        RuleFor(r => r.Shape).IsKnownEnum();
        RuleFor(r => r.Kind).IsKnownEnum();
        RuleFor(r => r.Cadence).IsKnownEnum();
        RuleFor(r => r.Name).IsRequired().HasMaxLength(100);
        RuleFor(r => r.RemindDaysBefore).IsWithin(0, 365);
        RuleFor(r => r.NextDueDate).IsRequired();
        RuleFor(r => r.Amount)
            .IsPositiveMoney()
            .WithMessage("Amount must be a positive decimal with at most 2 decimal places.");
        RuleFor(r => r.Amount)
            .IsPresent()
            .WithMessage("A fixed entry must have an amount.")
            .When(r => r.Kind == RecurringBillKind.Fixed);
        RuleFor(r => r.Amount)
            .IsAbsent()
            .WithMessage("A variable entry's amount is entered when it's confirmed, not set upfront.")
            .When(r => r.Kind == RecurringBillKind.Variable);

        When(r => r.Shape == RecurringBillShape.Transfer, () =>
        {
            RuleFor(r => r.AccountId)
                .IsRequired()
                .WithMessage("A recurring transfer needs the account the money leaves.");
            RuleFor(r => r.ToAccountId)
                .IsRequired()
                .WithMessage("A recurring transfer needs the account the money arrives in.")
                .DiffersFrom(r => r.AccountId)
                .WithErrorCode(ErrorCodes.TransferSameAccount)
                .WithMessage("Source and destination accounts must differ.");
            RuleFor(r => r.CategoryId)
                .IsAbsent()
                .WithMessage("A recurring transfer has no category.");
        }).Otherwise(() =>
            RuleFor(r => r.ToAccountId)
                .IsAbsent()
                .WithMessage("Only a recurring transfer has a destination account."));
    }
}
