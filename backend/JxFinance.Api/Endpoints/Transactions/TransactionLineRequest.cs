namespace JxFinance.Endpoints.Transactions;

public sealed record TransactionLineRequest(Guid? CategoryId, string Amount, string? Description);
