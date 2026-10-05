using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Email;
using JxFinance.Common.Settings;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class ExportTransactionsPdfEndpoint(
    ITransactionQueryService transactionService,
    IInstanceSettingsStore settings) : Endpoint<GetTransactionsRequest>
{
    public override void Configure()
    {
        Get(ApiRoutes.Transactions + "/export/pdf");
        Group<TransactionsGroup>();
        Metadata(QueryHouseholdScope.Instance);
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
            settings.Current.ReportingCurrency,
            EmailTexts.Product(settings.Current.InstanceName)).GeneratePdf();
        await Send.BytesAsync(pdf, ExportFileName.Transactions(req.DateFrom, req.DateTo, "pdf"), MediaTypeNames.Application.Pdf, cancellation: ct);
    }
}
