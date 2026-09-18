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
            .Must(MoneyWire.IsPositive)
            .WithMessage("Amount must be a decimal greater than 0 with at most 2 decimal places.");
        RuleFor(r => r.ReceivedAmount)
            .Must(a => a is null || MoneyWire.IsPositive(a))
            .WithMessage("Received amount must be a decimal greater than 0 with at most 2 decimal places.");
        RuleFor(r => r.Description).MaximumLength(500);
    }
}
