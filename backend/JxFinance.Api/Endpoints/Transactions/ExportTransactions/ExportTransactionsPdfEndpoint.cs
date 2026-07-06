using FastEndpoints;
using JxFinance.Endpoints.Accounts;
using JxFinance.Endpoints.Categories;
using JxFinance.Endpoints.Transactions.GetTransactions;

namespace JxFinance.Endpoints.Transactions.ExportTransactions;

public sealed class ExportTransactionsPdfEndpoint(
    ITransactionService transactionService,
    IAccountService accountService,
    ICategoryService categoryService) : Endpoint<GetTransactionsRequest>
{
    public override void Configure()
    {
        Get("/api/transactions/export/pdf");
    }

    public override async Task HandleAsync(GetTransactionsRequest req, CancellationToken ct)
    {
        var pdf = await ExportTransactionsEndpoint.BuildPdfAsync(transactionService, accountService, categoryService, req, ct);
        await Send.BytesAsync(pdf, "transactions.pdf", "application/pdf", cancellation: ct);
    }
}
