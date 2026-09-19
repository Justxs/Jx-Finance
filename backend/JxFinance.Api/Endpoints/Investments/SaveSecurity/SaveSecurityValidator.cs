using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Investments.SaveSecurity;

public sealed class SaveSecurityValidator : Validator<SaveSecurityRequest>
{
    public SaveSecurityValidator()
    {
        RuleFor(r => r.Symbol).IsRequired().HasMaxLength(32);
        RuleFor(r => r.Name).IsRequired().HasMaxLength(200);
        RuleFor(r => r.Type).IsKnownEnum();
        RuleFor(r => r.Currency).IsKnownEnum();
        RuleFor(r => r.Isin).HasFormat("^[A-Za-z]{2}[A-Za-z0-9]{9}[0-9]$").When(r => !string.IsNullOrWhiteSpace(r.Isin))
            .WithMessage("ISIN must be 12 characters: two letters, nine letters or digits, and a check digit.");
        RuleFor(r => r.Exchange).HasMaxLength(32);
        RuleFor(r => r.LastPrice)
            .IsNonNegativeQuantity()
            .WithMessage("Price must be a decimal of 0 or more with at most 8 decimal places.");
    }
}
