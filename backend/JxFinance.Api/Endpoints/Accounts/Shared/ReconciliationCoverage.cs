using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.Shared;

public sealed record ReconciliationCoverage(
    Guid AccountId,
    string AccountName,
    Currency AccountCurrency,
    Currency Currency,
    DateOnly Date,
    decimal? Difference);
