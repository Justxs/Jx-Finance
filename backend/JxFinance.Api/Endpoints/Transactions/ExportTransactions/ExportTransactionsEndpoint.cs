using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class ExportTransactionsEndpoint(
    ITransactionQueryService transactionService) : Endpoint<GetTransactionsRequest>
{
    public override void Configure()
    {
        Get(ApiRoutes.Transactions + "/export");
        Group<TransactionsGroup>();
        Options(b => b.WithMetadata(QueryHouseholdScope.Instance));
        Description(d => d.ProducesFile(MediaTypeNames.Text.Csv));
    }

    public override async Task HandleAsync(GetTransactionsRequest req, CancellationToken ct)
    {
        var names = await transactionService.ExportNamesAsync(ct);

        await using var writer = HttpContext.StartCsv("transactions.csv");
        await writer.WriteLineAsync(TransactionCsvWriter.Header);
        await foreach (var transaction in transactionService.StreamExportAsync(req, ct))
        {
            await writer.WriteLineAsync(TransactionCsvWriter.Row(transaction, names));
        }

        await writer.FlushAsync(ct);
    }
}
