using FastEndpoints;
using FluentValidation;
using JxFinance.Common;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Investments.GetTaxSummary;

public sealed class GetTaxSummaryValidator : Validator<GetTaxSummaryRequest>
{
    public const int FirstYear = 1900;
    public const int LastYear = 2999;
    public const int MaxAccounts = 50;

    public GetTaxSummaryValidator()
    {
        RuleFor(r => r.Year)
            .Must(year => year is null or (>= FirstYear and <= LastYear))
            .WithErrorCode(ErrorCodes.RangeInvalid)
            .WithMessage($"year must be between {FirstYear} and {LastYear}.");

        RuleFor(r => r.AccountIds)
            .Must(ids => GuidList.IsWellFormed(ids, MaxAccounts))
            .WithErrorCode(ErrorCodes.TextInvalidFormat)
            .WithMessage($"accountIds must be up to {MaxAccounts} account ids separated by commas.");
    }
}
