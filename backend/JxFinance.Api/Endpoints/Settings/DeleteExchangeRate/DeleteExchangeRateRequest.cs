using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Settings.DeleteExchangeRate;

public sealed record DeleteExchangeRateRequest(Currency Currency, DateOnly Date);
