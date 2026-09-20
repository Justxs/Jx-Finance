using FastEndpoints;

namespace JxFinance.Endpoints.Investments.SetSecurityPrice;

public sealed class SetSecurityPriceSummary : Summary<SetSecurityPriceEndpoint, SetSecurityPriceRequest>
{
    public SetSecurityPriceSummary()
    {
        Summary = "Set the last known price of a security";
        Description = "Sets the price by hand. Securities are shared by every user of the installation, so this is open "
            + "only to a user who currently holds the security on an account they can see, and to administrators. A "
            + "broker import overwrites the price when its report date is the same or newer.";
        RequestParam(r => r.LastPriceDate, "Defaults to today.");
        Responses[200] = "The security with its new price.";
        Responses[403] = "The caller holds no open position in this security and is not an administrator.";
        Responses[404] = "No such security.";
    }
}
