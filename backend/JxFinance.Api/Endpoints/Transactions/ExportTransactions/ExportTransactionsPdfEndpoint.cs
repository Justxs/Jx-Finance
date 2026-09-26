using System.Net.Mime;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Tags.Interfaces;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class ExportTransactionsPdfEndpoint(
    ITransactionService transactionService,
    IAccountService accountService,
    ICategoryService categoryService,
    ITagService tagService,
    IInstanceSettingsStore settings) : Endpoint<GetTransactionsRequest>
{
    public override void Configure()
    {
        Get(ApiRoutes.Transactions + "/export/pdf");
        Group<TransactionsGroup>();
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

        var names = await ExportNames.LoadAsync(accountService, categoryService, tagService, ct);

        var pdf = new TransactionsPdfDocument(
            transactions,
            names,
            req.DateFrom,
            req.DateTo,
            settings.Current.ReportingCurrency).GeneratePdf();
        await Send.BytesAsync(pdf, "transactions.pdf", MediaTypeNames.Application.Pdf, cancellation: ct);
    }
}
