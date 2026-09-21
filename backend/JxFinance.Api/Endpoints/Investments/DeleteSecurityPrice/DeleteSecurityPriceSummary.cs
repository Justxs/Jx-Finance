using FastEndpoints;

namespace JxFinance.Endpoints.Investments.DeleteSecurityPrice;

public sealed class DeleteSecurityPriceSummary : Summary<DeleteSecurityPriceEndpoint, DeleteSecurityPriceRequest>
{
    public DeleteSecurityPriceSummary()
    {
        Summary = "Delete a point of a security's price history";
        Description = "Removes the price recorded for one date. The same rule as setting a price applies: open to a "
            + "user who currently holds the security on an account they can see, and to administrators. The last "
            + "known price of the security becomes the newest remaining point, or empty when none is left.";
        RequestParam(r => r.Date, "The date of the point, as yyyy-MM-dd.");
        Responses[204] = "Deleted.";
        Responses[403] = "The caller holds no open position in this security and is not an administrator.";
        Responses[404] = "No such security, or no price recorded for that date.";
    }
}
