using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Currencies.Shared;

public sealed record ExchangeRateResponse(Currency From, Currency To, string Rate, DateOnly AsOf);
