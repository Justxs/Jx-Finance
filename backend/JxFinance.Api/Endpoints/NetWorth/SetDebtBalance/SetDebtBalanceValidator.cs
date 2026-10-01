using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.SetDebtBalance;

public sealed class SetDebtBalanceValidator : Validator<SetDebtBalanceRequest>
{
    public SetDebtBalanceValidator()
    {
        RuleFor(r => r.Date)
            .IsRequired()
            .IsNotInFuture(() => Resolve<IClock>().Today)
            .WithMessage("The balance date cannot be in the future.");
        RuleFor(r => r.Amount)
            .IsPresent()
            .IsNonNegativeMoney()
            .WithMessage("Outstanding amount must be a non-negative decimal with at most 2 decimal places.");
        RuleFor(r => r.Note).HasMaxLength(DebtBalanceEntry.NoteMaxLength);
    }
}
