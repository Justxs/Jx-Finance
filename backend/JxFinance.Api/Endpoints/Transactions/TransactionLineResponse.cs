namespace JxFinance.Endpoints.Transactions;

public sealed record TransactionLineResponse(Guid Id, Guid? CategoryId, string Amount, string? Description);
