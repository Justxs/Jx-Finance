using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.BulkCategorizeTransactions;
using JxFinance.Endpoints.Transactions.BulkTagTransactions;
using JxFinance.Endpoints.Transactions.CreateTransaction;
using JxFinance.Endpoints.Transactions.ExportTransactions;
using JxFinance.Endpoints.Transactions.GetLedger;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.GetTransactionsSummary;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Endpoints.Transactions.UpdateTransaction;

namespace JxFinance.Endpoints.Transactions.Interfaces;

public interface ITransactionService
{
    Task<PagedResponse<TransactionResponse>> GetPageAsync(
        GetTransactionsRequest request,
        CancellationToken cancellationToken);

    Task<PagedResponse<LedgerItemResponse>> GetLedgerPageAsync(
        GetLedgerRequest request,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<TransactionResponse>> ListGroupMembersAsync(
        TransactionGroupId groupId,
        TransactionFilterRequest filter,
        int limit,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<TransactionResponse>> ListUncategorizedAsync(
        TransactionFilterRequest filter,
        int limit,
        CancellationToken cancellationToken);

    Task<TransactionsSummaryResponse> GetSummaryAsync(
        GetTransactionsSummaryRequest request,
        CancellationToken cancellationToken);

    Task<Result<TransactionResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken);

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

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);

    Task<Result<Guid>> SetUnusualDismissedAsync(Guid id, bool dismissed, CancellationToken cancellationToken);

    Task<ExportNames> ExportNamesAsync(CancellationToken cancellationToken);

    IAsyncEnumerable<TransactionResponse> StreamExportAsync(
        GetTransactionsRequest request,
        CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<TransactionResponse>>> ExportForPdfAsync(
        GetTransactionsRequest request,
        CancellationToken cancellationToken);
}
