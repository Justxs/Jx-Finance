using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.UpdateAccount;

public sealed class UpdateAccountValidator : Validator<UpdateAccountRequest>
{
    public UpdateAccountValidator()
    {
        RuleFor(r => r.Name).NotEmpty().MaximumLength(100);
        RuleFor(r => r.Description).MaximumLength(500);
        RuleFor(r => r.Iban)
            .Must(Iban.IsValid)
            .WithMessage("IBAN must be a valid IBAN (e.g. LT12 1000 0111 0100 1000).");
        RuleFor(r => r.StartingBalance)
            .IsMoney()
            .WithMessage("Starting balance must be a decimal with at most 2 decimal places.");
        RuleFor(r => r.HouseholdId)
            .NotNull()
            .WithMessage("A shared account needs a household.")
            .When(r => r.Scope == Scope.Shared);
    }
}
