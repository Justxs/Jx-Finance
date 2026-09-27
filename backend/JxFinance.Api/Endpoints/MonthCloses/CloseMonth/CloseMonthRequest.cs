using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Domain.MonthCloses;

namespace JxFinance.Endpoints.MonthCloses.CloseMonth;

public sealed record CloseMonthRequest(string? Note);

public sealed class CloseMonthValidator : Validator<CloseMonthRequest>
{
    public CloseMonthValidator()
    {
        RuleFor(r => r.Note).HasMaxLength(MonthClose.NoteMaxLength);
    }
}
