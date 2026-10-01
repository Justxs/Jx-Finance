namespace JxFinance.Endpoints.TransactionGroups.AddToTransactionGroup;

public sealed record AddToTransactionGroupRequest(Guid Id, IReadOnlyList<Guid> TransactionIds);
