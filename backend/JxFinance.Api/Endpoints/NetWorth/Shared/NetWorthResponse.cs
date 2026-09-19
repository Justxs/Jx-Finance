using JxFinance.Common.Json;

namespace JxFinance.Endpoints.NetWorth.Shared;

public sealed record NetWorthResponse(
    [property: Money] decimal Accounts,
    [property: Money] decimal Assets,
    [property: Money] decimal Debts,
    [property: Money] decimal NetWorth);

public sealed record NetWorthSnapshotItem(
    DateOnly Date,
    [property: Money] decimal Accounts,
    [property: Money] decimal Assets,
    [property: Money] decimal Debts,
    [property: Money] decimal NetWorth);

public sealed record NetWorthHistoryResponse(IReadOnlyList<NetWorthSnapshotItem> Items);
