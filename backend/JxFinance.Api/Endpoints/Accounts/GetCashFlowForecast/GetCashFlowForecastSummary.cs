using FastEndpoints;

namespace JxFinance.Endpoints.Accounts.GetCashFlowForecast;

public sealed class GetCashFlowForecastSummary : Summary<GetCashFlowForecastEndpoint, GetCashFlowForecastRequest>
{
    public GetCashFlowForecastSummary()
    {
        Summary = "Forecast account balances from recurring entries";
        Description = "Projects each visible account's balance in its main currency from today to the end of the "
            + "horizon. It starts from the balance as of today, places ledger rows already dated after today on "
            + "their own dates, and adds every occurrence of the caller's own active recurring entries: expenses "
            + "and income on their account, transfers out of the source and, when the caller can see it, into the "
            + "destination at the newest exchange rate. A fixed entry counts its amount; a variable entry counts the "
            + "median of its last six matching rows within 13 months and is marked estimated. An occurrence before "
            + "today is placed on today and marked overdue, and the next one is skipped when a matching row already "
            + "paid it. usualDailySpending is the median daily spending of the last three complete months outside the "
            + "entries, null with less history. Only accounts with an entry in the horizon are listed, those that go "
            + "below zero first. notCounted names the entries that could not be placed. Nothing is stored. Needs the "
            + "recurringBills feature.";
        RequestParam(r => r.Days, "How many days after today to project, from 30 to 90. Defaults to 90.");
        Responses[200] = "The forecast per account and the entries left out.";
        Responses[400] = "days is outside 30 to 90.";
    }
}
