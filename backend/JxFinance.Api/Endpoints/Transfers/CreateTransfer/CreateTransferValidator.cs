using FastEndpoints;
using FluentValidation;
using JxFinance.Common;

namespace JxFinance.Endpoints.Transfers.CreateTransfer;

public sealed class CreateTransferValidator : Validator<CreateTransferRequest>
{
    public CreateTransferValidator()
    {
        RuleFor(r => r.FromAccountId).NotEmpty();
        RuleFor(r => r.ToAccountId)
            .NotEmpty()
            .NotEqual(r => r.FromAccountId)
            .WithMessage("Source and destination accounts must differ.");
        RuleFor(r => r.Amount)
            .Must(MoneyWire.IsValid)
            .WithMessage("Amount must be a decimal with at most 2 decimal places.");
        RuleFor(r => r.Amount)
            .Must(a => MoneyWire.IsValid(a) && MoneyWire.Parse(a).Amount > 0)
            .WithMessage("Amount must be greater than 0.");
        RuleFor(r => r.Description).MaximumLength(500);
    }
}
