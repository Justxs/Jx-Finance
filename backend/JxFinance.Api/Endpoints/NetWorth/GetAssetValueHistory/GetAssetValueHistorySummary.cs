using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.NetWorth.GetAssetValueHistory;

public sealed class GetAssetValueHistorySummary : Summary<GetAssetValueHistoryEndpoint, GetAssetValueHistoryRequest>
{
    public GetAssetValueHistorySummary()
    {
        Summary = "Get the value of an asset over time";
        Description = "Returns the value of an asset for a series of dates, in its own currency. Nothing is stored: each "
            + "value is the latest valuation on or before the date, less the straight-line depreciation since then when "
            + "the asset depreciates. The series is daily for ranges up to about three months, weekly up to two years and "
            + "monthly beyond, always ends on the last date of the range, and also holds every valuation date in the "
            + "range, marked with isValuation. Dates before the first valuation have no point.";
        Params["id"] = "The asset id.";
        RequestParam(r => r.From, "First date of the range. Defaults to the first valuation.");
        RequestParam(r => r.To, "Last date of the range. Defaults to today and is never later than today.");
        Responses[200] = "The points, oldest first.";
        Responses[400] = SummaryText.ValidationFailed;
        Responses[404] = "No such asset belongs to the signed-in user.";
    }
}
