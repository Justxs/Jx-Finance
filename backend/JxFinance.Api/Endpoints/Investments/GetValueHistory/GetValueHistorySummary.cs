using FastEndpoints;

namespace JxFinance.Endpoints.Investments.GetValueHistory;

public sealed class GetValueHistorySummary : Summary<GetValueHistoryEndpoint, GetValueHistoryRequest>
{
    public GetValueHistorySummary()
    {
        Summary = "Get the portfolio value over time";
        Description = "Returns the market value and the invested cost of the caller's open positions for a series of "
            + "dates, in the reporting currency. Nothing is stored: for every date the buys, sells and splits up to "
            + "that date are replayed first in, first out, each open position is valued at the latest recorded price "
            + "on or before the date and converted at the exchange rate on or before the date, and the cost is what "
            + "the remaining lots cost at the rate of their purchase. The series is daily for ranges up to about three "
            + "months, weekly up to two years and monthly beyond, always ends on the last date of the range, and "
            + "starts no earlier than the first trade. A point is partial when a position had no price or no exchange "
            + "rate yet, or an imported history sold more than it bought; such a position is left out of both figures.";
        RequestParam(r => r.From, "First date of the range. Defaults to one year before the end.");
        RequestParam(r => r.To, "Last date of the range. Defaults to today and is never later than today.");
        RequestParam(r => r.AccountId, "Only positions on this account.");
        Responses[200] = "The points, oldest first. Empty when there was no trade on or before the end of the range.";
    }
}
