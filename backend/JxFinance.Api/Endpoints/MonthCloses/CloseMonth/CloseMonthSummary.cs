using FastEndpoints;

namespace JxFinance.Endpoints.MonthCloses.CloseMonth;

public sealed class CloseMonthSummary : Summary<CloseMonthEndpoint, CloseMonthRequest>
{
    public CloseMonthSummary()
    {
        Summary = "Close or re-close a month";
        Description = "Freezes a snapshot of the month's figures as the report summary answers them now, for you and "
            + "the household scope you are viewing. Nothing is locked: every transaction stays editable, and later "
            + "changes show as drift in the month review. Closing an already closed month replaces its snapshot, "
            + "which is how drift is accepted. A note is optional; leaving it out keeps the note already saved, and "
            + "an empty note clears it. Only a month that has ended in the installation time zone can be closed.";
        ExampleRequest = new CloseMonthRequest("Reconciled with the bank statement.");
        Params["month"] = "The month as YYYY-MM.";
        RequestParam(r => r.Note, "At most 1000 characters.");
        Responses[200] = "The month review after the close.";
        Responses[400] = "Validation failed, or monthClose.invalidMonth.";
        Responses[409] = "monthClose.notEnded: the month has not ended yet.";
    }
}
