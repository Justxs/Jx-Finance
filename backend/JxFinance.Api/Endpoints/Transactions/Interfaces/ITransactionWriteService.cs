using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transactions.BulkCategorizeTransactions;
using JxFinance.Endpoints.Transactions.BulkDeleteTransactions;
using JxFinance.Endpoints.Transactions.BulkMoveTransactions;
using JxFinance.Endpoints.Transactions.BulkTagTransactions;
using JxFinance.Endpoints.Transactions.CreateTransaction;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Endpoints.Transactions.UpdateTransaction;

namespace JxFinance.Endpoints.Transactions.Interfaces;

public interface ITransactionWriteService
{
    Task<Result<TransactionResponse>> CreateAsync(
        CreateTransactionRequest request,
        CancellationToken cancellationToken);

    Task<Result<TransactionResponse>> UpdateAsync(
        UpdateTransactionRequest request,
        CancellationToken cancellationToken);

    Task<Result<int>> BulkCategorizeAsync(
        BulkCategorizeTransactionsRequest request,
        CancellationToken cancellationToken);

    Task<Result<int>> BulkTagAsync(
        BulkTagTransactionsRequest request,
        CancellationToken cancellationToken);

    Task<Result<int>> BulkDeleteAsync(
        BulkDeleteTransactionsRequest request,
        CancellationToken cancellationToken);

    Task<Result<BulkMoveTransactionsResponse>> BulkMoveAsync(
        BulkMoveTransactionsRequest request,
        CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<Guid>> SetUnusualDismissedAsync(Guid id, bool dismissed, CancellationToken cancellationToken);

    Task<Result<Guid>> KeepPossibleDuplicatesAsync(Guid id, CancellationToken cancellationToken);
}
