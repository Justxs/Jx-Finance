using FastEndpoints;

namespace JxFinance.Endpoints.MonthCloses.UpdateMonthNote;

public sealed class UpdateMonthNoteSummary : Summary<UpdateMonthNoteEndpoint, UpdateMonthNoteRequest>
{
    public UpdateMonthNoteSummary()
    {
        Summary = "Change the note of a closed month";
        Description = "Replaces the note of the close in the household scope you are viewing, without touching its "
            + "snapshot. An empty note clears it.";
        ExampleRequest = new UpdateMonthNoteRequest("Two refunds still pending.");
        Params["month"] = "The month as YYYY-MM.";
        RequestParam(r => r.Note, "At most 1000 characters.");
        Responses[200] = "The month review with the new note.";
        Responses[400] = "Validation failed, or month.invalid.";
        Responses[404] = "The month is not closed in this scope.";
    }
}
