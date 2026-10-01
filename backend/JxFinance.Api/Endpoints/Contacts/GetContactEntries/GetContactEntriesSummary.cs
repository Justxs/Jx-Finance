using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.GetContactEntries;

public sealed class GetContactEntriesSummary : Summary<GetContactEntriesEndpoint, GetContactEntriesRequest>
{
    public GetContactEntriesSummary()
    {
        Summary = "List what you shared with a person";
        Description = "Returns a page of the person's history, newest first: each split with its copied date and "
            + "description and the person's share as amount, and each payment with its direction and note. counted is "
            + "false while a split's transaction is deleted; a payment always counts.";
        Params["id"] = ContactSummaryText.Id;
        this.DescribePaging();
        Responses[200] = "A page of splits and payments with the total row count.";
        Responses[404] = ContactSummaryText.NotFound;
    }
}
