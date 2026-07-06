namespace JxFinance.Endpoints.NetWorth;

public sealed record NetWorthResponse(string Accounts, string Assets, string Debts, string NetWorth);

public sealed record NetWorthSnapshotItem(DateOnly Date, string Accounts, string Assets, string Debts, string NetWorth);

public sealed record NetWorthHistoryResponse(IReadOnlyList<NetWorthSnapshotItem> Items);
