using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class ExportTransactionsPdfEndpoint(
    ITransactionService transactionService,
    IInstanceSettingsStore settings) : Endpoint<GetTransactionsRequest>
{
    public override void Configure()
    {
        Get(ApiRoutes.Transactions + "/export/pdf");
        Group<TransactionsGroup>();
        Options(b => b.WithMetadata(QueryHouseholdScope.Instance));
        Description(d => d.ProducesFile(MediaTypeNames.Application.Pdf));
    }

    public override async Task HandleAsync(GetTransactionsRequest req, CancellationToken ct)
    {
        var result = await transactionService.ExportForPdfAsync(req, ct);
        if (!result.TryGetValue(out var transactions))
        {
            await Send.ProblemAsync(result.Error, ct);
            return;
        }

        var names = await transactionService.ExportNamesAsync(ct);

        var pdf = new TransactionsPdfDocument(
            transactions,
            names,
            req.DateFrom,
            req.DateTo,
            settings.Current.ReportingCurrency).GeneratePdf();
        await Send.BytesAsync(pdf, "transactions.pdf", MediaTypeNames.Application.Pdf, cancellation: ct);
    }
}
