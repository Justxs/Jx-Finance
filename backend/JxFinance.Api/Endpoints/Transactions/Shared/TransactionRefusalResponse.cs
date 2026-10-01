namespace JxFinance.Endpoints.Transactions.Shared;

public sealed record TransactionRefusalResponse(Guid TransactionId, string Code, string Reason);
