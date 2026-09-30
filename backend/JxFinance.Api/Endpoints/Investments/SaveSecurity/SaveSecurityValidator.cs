using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.SaveSecurity;

public sealed class SaveSecurityValidator : Validator<SaveSecurityRequest>
{
    public SaveSecurityValidator()
    {
        RuleFor(r => r.Symbol).IsRequired().HasMaxLength(Security.SymbolMaxLength);
        RuleFor(r => r.Name).IsRequired().HasMaxLength(Security.NameMaxLength);
        RuleFor(r => r.Type).IsKnownEnum();
        RuleFor(r => r.Currency).IsKnownEnum();
        RuleFor(r => r.Isin).HasFormat("^[A-Za-z]{2}[A-Za-z0-9]{9}[0-9]$").When(r => !string.IsNullOrWhiteSpace(r.Isin))
            .WithMessage("ISIN must be 12 characters: two letters, nine letters or digits, and a check digit.");
        RuleFor(r => r.Exchange).HasMaxLength(Security.ExchangeMaxLength);
        RuleFor(r => r.LastPrice)
            .IsNonNegativeQuantity()
            .WithMessage("Price must be a decimal of 0 or more with at most 8 decimal places.");
        RuleFor(r => r.LastPriceDate)
            .IsNotInFuture(() => Resolve<IClock>().Today)
            .WithMessage("The price date cannot be in the future.");
        RuleFor(r => r.PriceSource).IsKnownEnum();
        RuleFor(r => r.PriceSymbol).HasMaxLength(Security.PriceSymbolMaxLength);
        RuleFor(r => r.PriceSymbol).IsRequired().When(r => r.PriceSource != PriceSource.None)
            .WithMessage("Enter the symbol the price source uses for this security.");
        RuleFor(r => r.PriceSource)
            .Must((r, source) => source != PriceSource.Kraken || r is { Type: SecurityType.Crypto, Currency: Currency.Eur })
            .WithErrorCode(ErrorCodes.RangeInvalid)
            .WithMessage("Kraken prices only crypto priced in EUR.");
    }
}
