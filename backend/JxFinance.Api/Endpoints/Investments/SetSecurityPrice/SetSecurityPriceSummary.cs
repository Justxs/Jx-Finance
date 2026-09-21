using FastEndpoints;

namespace JxFinance.Endpoints.Investments.SetSecurityPrice;

public sealed class SetSecurityPriceSummary : Summary<SetSecurityPriceEndpoint, SetSecurityPriceRequest>
{
    public SetSecurityPriceSummary()
    {
        Summary = "Record a price of a security";
        Description = "Records the price for one date by hand, replacing a price already recorded for that date. "
            + "Securities are shared by every user of the installation, so this is open only to a user who currently "
            + "holds the security on an account they can see, and to administrators. The last known price of the "
            + "security follows the newest date: a price for an earlier date adds a history point and leaves the last "
            + "known price alone. A broker import records the mark price of its report date the same way.";
        RequestParam(r => r.LastPriceDate, "Defaults to today in the installation time zone. Not in the future.");
        Responses[200] = "The security with its last known price.";
        Responses[403] = "The caller holds no open position in this security and is not an administrator.";
        Responses[404] = "No such security.";
        Responses[409] = "Someone else recorded a price for the same date at the same moment. Try again.";
    }
}
