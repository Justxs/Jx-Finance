using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.GetTaxSummary;

public sealed class GetTaxSummaryValidator : Validator<GetTaxSummaryRequest>
{
    public const int FirstYear = 1900;
    public const int LastYear = 2999;

    public GetTaxSummaryValidator()
    {
        RuleFor(r => r.Year)
            .Must(year => year is null or (>= FirstYear and <= LastYear))
            .WithErrorCode(ErrorCodes.RangeInvalid)
            .WithMessage($"year must be between {FirstYear} and {LastYear}.");

        RuleFor(r => r.AccountIds)
            .Must(AccountSelection.IsWellFormed)
            .WithErrorCode(ErrorCodes.TextInvalidFormat)
            .WithMessage($"accountIds must be up to {AccountSelection.MaxAccounts} account ids separated by commas.");
    }
}
