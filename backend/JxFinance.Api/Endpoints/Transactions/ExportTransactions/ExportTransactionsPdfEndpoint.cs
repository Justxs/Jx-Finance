using FastEndpoints;
using JxFinance.Endpoints.Accounts.Interfaces;
using JxFinance.Endpoints.Categories.Interfaces;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class ExportTransactionsPdfEndpoint(
    ITransactionService transactionService,
    IAccountService accountService,
    ICategoryService categoryService) : Endpoint<GetTransactionsRequest>
{
    public override void Configure()
    {
        Get("transactions/export/pdf");
        Group<TransactionsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<byte[]>(200, "application/pdf"));
    }

    public override async Task HandleAsync(GetTransactionsRequest req, CancellationToken ct)
    {
        var pdf = await ExportTransactionsEndpoint.BuildPdfAsync(transactionService, accountService, categoryService, req, ct);
        await Send.BytesAsync(pdf, "transactions.pdf", "application/pdf", cancellation: ct);
    }
}
