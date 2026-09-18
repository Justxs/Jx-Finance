using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.Shared;

public sealed record CurrencyBalance(Currency Currency, string Amount);
