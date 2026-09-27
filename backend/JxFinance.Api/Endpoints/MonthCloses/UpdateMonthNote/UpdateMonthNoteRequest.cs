using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Domain.MonthCloses;

namespace JxFinance.Endpoints.MonthCloses.UpdateMonthNote;

public sealed record UpdateMonthNoteRequest(string? Note);

public sealed class UpdateMonthNoteValidator : Validator<UpdateMonthNoteRequest>
{
    public UpdateMonthNoteValidator()
    {
        RuleFor(r => r.Note).HasMaxLength(MonthClose.NoteMaxLength);
    }
}
