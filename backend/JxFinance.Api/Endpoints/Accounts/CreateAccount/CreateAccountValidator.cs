using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Accounts.CreateAccount;

public sealed class CreateAccountValidator : Validator<CreateAccountRequest>
{
    public CreateAccountValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(100);
        RuleFor(r => r.Description).HasMaxLength(500);
        RuleFor(r => r.Iban)
            .Must(Iban.IsValid)
            .WithErrorCode(ErrorCodes.IbanInvalid)
            .WithMessage("IBAN must be a valid IBAN (e.g. LT12 1000 0111 0100 1000).");
        RuleFor(r => r.StartingBalance)
            .IsPresent()
            .WithMessage("Starting balance is required.")
            .IsMoney()
            .WithMessage("Starting balance must be a decimal with at most 2 decimal places.");
        RuleFor(r => r.HouseholdId)
            .NotNull()
            .WithErrorCode(ErrorCodes.HouseholdRequired)
            .WithMessage("A shared account needs a household.")
            .When(r => r.Scope == Scope.Shared);
    }
}
