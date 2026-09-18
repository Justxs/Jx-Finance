using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Currencies.Shared;

public sealed record CurrenciesResponse(
    Currency ReportingCurrency,
    IReadOnlyList<Currency> Currencies,
    DateOnly? RatesAsOf);
