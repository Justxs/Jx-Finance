using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed record ImportStatementBalance(DateOnly ClosingDate, [property: Money] decimal ClosingBalance, Currency ClosingCurrency);
