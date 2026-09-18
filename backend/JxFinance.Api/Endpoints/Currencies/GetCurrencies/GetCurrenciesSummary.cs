using FastEndpoints;

namespace JxFinance.Endpoints.Currencies.GetCurrencies;

public sealed class GetCurrenciesSummary : Summary<GetCurrenciesEndpoint>
{
    public GetCurrenciesSummary()
    {
        Summary = "List supported currencies";
        Description = "Returns the currencies accounts and transactions can use, the reporting currency "
            + "that totals, budgets, and reports are expressed in, and the date of the newest stored "
            + "exchange rates. Rates are European Central Bank reference rates.";
        Responses[200] = "The supported currencies.";
    }
}
