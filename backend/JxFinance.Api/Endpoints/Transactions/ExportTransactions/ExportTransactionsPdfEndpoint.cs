using FastEndpoints;
using JxFinance.Common.Settings;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class ExportTransactionsPdfEndpoint(
    ITransactionService transactionService,
    IAccountService accountService,
    ICategoryService categoryService,
    IInstanceSettingsStore settings) : Endpoint<GetTransactionsRequest>
{
    public override void Configure()
    {
        Get("transactions/export/pdf");
        Group<TransactionsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<byte[]>(200, "application/pdf"));
    }

    public override async Task HandleAsync(GetTransactionsRequest req, CancellationToken ct)
    {
        var (transactions, accountNames, categoryNames) =
            await ExportTransactionsEndpoint.LoadAsync(transactionService, accountService, categoryService, req, ct);

        var pdf = new TransactionsPdfDocument(
            transactions,
            accountNames,
            categoryNames,
            req.DateFrom,
            req.DateTo,
            settings.Current.ReportingCurrency).GeneratePdf();
        await Send.BytesAsync(pdf, "transactions.pdf", "application/pdf", cancellation: ct);
    }
}
