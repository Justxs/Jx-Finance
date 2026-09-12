namespace JxFinance.Endpoints.Transactions.Shared;

public sealed record TransactionLineRequest(Guid? CategoryId, string Amount, string? Description);
