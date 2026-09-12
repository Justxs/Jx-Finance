using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transactions.CreateTransaction;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Endpoints.Transactions.UpdateTransaction;

namespace JxFinance.Endpoints.Transactions.Interfaces;

public interface ITransactionService
{
    Task<PagedResponse<TransactionResponse>> GetPageAsync(
        GetTransactionsRequest request,
        CancellationToken cancellationToken);

    Task<Result<TransactionResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<TransactionResponse>> CreateAsync(
        CreateTransactionRequest request,
        CancellationToken cancellationToken);

    Task<Result<TransactionResponse>> UpdateAsync(
        UpdateTransactionRequest request,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<TransactionResponse>> ExportAsync(
        GetTransactionsRequest request,
        CancellationToken cancellationToken);
}
