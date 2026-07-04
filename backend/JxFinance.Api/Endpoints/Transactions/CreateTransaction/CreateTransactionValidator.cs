using FastEndpoints;
using FluentValidation;
using JxFinance.Common;

namespace JxFinance.Endpoints.Transactions.CreateTransaction;

public sealed class CreateTransactionValidator : Validator<CreateTransactionRequest>
{
    public CreateTransactionValidator()
    {
        RuleFor(r => r.AccountId).NotEmpty();
        RuleFor(r => r.Amount)
            .Must(amount => MoneyWire.IsValid(amount) && MoneyWire.Parse(amount!).Amount > 0)
            .WithMessage("Amount must be a positive decimal with at most 2 decimal places.");
        RuleFor(r => r.Date).NotEmpty();
        RuleFor(r => r.Description).MaximumLength(500);
    }
}
