namespace JxFinance.Endpoints.Transactions.GetTransactions;

public sealed class GetTransactionsRequest
{
    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = 20;

    public Guid? AccountId { get; init; }
}
