namespace JxFinance.Endpoints.TransactionGroups.CreateTransactionGroup;

public sealed record CreateTransactionGroupRequest(string Name, IReadOnlyList<Guid> TransactionIds);
