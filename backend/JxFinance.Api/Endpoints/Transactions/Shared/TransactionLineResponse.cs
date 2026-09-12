namespace JxFinance.Endpoints.Transactions.Shared;

public sealed record TransactionLineResponse(Guid Id, Guid? CategoryId, string Amount, string? Description);
