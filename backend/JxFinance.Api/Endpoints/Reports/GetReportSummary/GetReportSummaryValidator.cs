using FastEndpoints;
using FluentValidation;
using JxFinance.Common;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Reports.GetReportSummary;

public sealed class GetReportSummaryValidator : Validator<GetReportSummaryRequest>
{
    private static readonly DateOnly FirstDay = new(MonthKey.MinYear, 1, 1);
    private static readonly DateOnly LastDay = new(MonthKey.MaxYear, 12, 31);
    private static readonly string OutOfRange = $"Dates must fall between {FirstDay:yyyy-MM-dd} and {LastDay:yyyy-MM-dd}.";

    public GetReportSummaryValidator()
    {
        RuleFor(r => r.DateFrom)
            .IsWithin(FirstDay, LastDay)
            .WithMessage(OutOfRange)
            .IsNotAfter(r => r.DateTo ?? Resolve<IClock>().Today);
        RuleFor(r => r.DateTo).IsWithin(FirstDay, LastDay).WithMessage(OutOfRange);
    }
}
