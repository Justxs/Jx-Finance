using FastEndpoints;

namespace JxFinance.Endpoints.Payees.GetPayeeNames;

public sealed class GetPayeeNamesSummary : Summary<GetPayeeNamesEndpoint>
{
    public GetPayeeNamesSummary()
    {
        Summary = "List your payee names";
        Description = "Returns the display names you gave to payees, ordered by name. A payee is the normalized "
            + "description every transaction stores as its payee key; a name is personal and shows in place of the "
            + "bank's text wherever that key appears for you.";
        Responses[200] = "Your payee names, possibly empty.";
    }
}
