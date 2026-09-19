using FastEndpoints;

namespace JxFinance.Endpoints.Investments.SaveSecurity;

public sealed class CreateSecuritySummary : Summary<CreateSecurityEndpoint, SaveSecurityRequest>
{
    public CreateSecuritySummary()
    {
        Summary = "Add a security";
        Description = "Adds a stock, ETF, fund, bond or other instrument that trades can refer to. Symbol and currency "
            + "together must be unique.";
        Responses[200] = "The security.";
        Responses[409] = "A security with this symbol and currency already exists.";
    }
}

public sealed class UpdateSecuritySummary : Summary<UpdateSecurityEndpoint, SaveSecurityRequest>
{
    public UpdateSecuritySummary()
    {
        Summary = "Update a security or its price";
        Description = "Changes the details or sets the last known price by hand. A broker import overwrites the price "
            + "when its report date is the same or newer.";
        RequestParam(r => r.LastPriceDate, "Defaults to today when a price is given without a date.");
        Responses[200] = "The security.";
        Responses[404] = "No such security.";
    }
}
