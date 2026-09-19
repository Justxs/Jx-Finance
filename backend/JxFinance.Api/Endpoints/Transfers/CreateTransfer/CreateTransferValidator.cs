using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Transfers.CreateTransfer;

public sealed class CreateTransferValidator : Validator<CreateTransferRequest>
{
    public CreateTransferValidator()
    {
        RuleFor(r => r.FromAccountId).IsRequired();
        RuleFor(r => r.ToAccountId)
            .IsRequired()
            .NotEqual(r => r.FromAccountId)
            .WithErrorCode(ErrorCodes.TransferSameAccount)
            .WithMessage("Source and destination accounts must differ.");
        RuleFor(r => r.Amount)
            .IsPositiveMoney()
            .WithMessage("Amount must be a decimal greater than 0 with at most 2 decimal places.");
        RuleFor(r => r.ReceivedAmount)
            .IsPositiveMoney()
            .WithMessage("Received amount must be a decimal greater than 0 with at most 2 decimal places.");
        RuleFor(r => r.Description).HasMaxLength(500);
    }
}
