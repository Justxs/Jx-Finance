using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Accounts.GetAccounts;

public sealed class GetAccountsRequest
{
    public string? Search { get; init; }

    public string? Iban { get; init; }

    public AccountType? Type { get; init; }

    public AccountSortField? Sort { get; init; }

    public SortDirection? Direction { get; init; }
}
