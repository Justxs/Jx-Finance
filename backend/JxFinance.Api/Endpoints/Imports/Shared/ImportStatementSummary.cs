using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Imports.Shared;

public sealed record ImportStatementSummary(
    string? Iban,
    bool IbanMatchesAccount,
    Guid? OtherAccountId,
    int NotBooked,
    int Unreadable,
    DateOnly? ClosingDate,
    [property: Money] decimal? ClosingBalance,
    Currency? ClosingCurrency,
    [property: Money] decimal? LedgerBalanceAtClose);
