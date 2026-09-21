using System.Globalization;
using System.Text;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Investments.GetTaxSummary;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.ExportTaxSummary;

public sealed class ExportTaxSummaryEndpoint(ITaxSummaryService taxSummaryService) : Endpoint<GetTaxSummaryRequest>
{
    public const string Header =
        "Section,Date,Account,Security,Currency,Quantity,Amount,CostBasis,Gain,"
        + "ReportingCurrency,ReportingAmount,ReportingCostBasis,ReportingGain,AcquiredOn,Description";

    private const int BufferSize = 16 * 1024;

    public override void Configure()
    {
        Get("investments/tax-summary/export");
        Group<InvestmentsGroup>();
        Description(d => d.ClearDefaultProduces(200).Produces<byte[]>(200, "text/csv"));
    }

    public override async Task HandleAsync(GetTaxSummaryRequest req, CancellationToken ct)
    {
        var summary = await taxSummaryService.GetAsync(req, ct);
        var accounts = summary.Accounts.ToDictionary(a => a.Id, a => a.Name);
        var reporting = summary.ReportingCurrency.ToCode();

        HttpContext.MarkResponseStart();
        HttpContext.Response.StatusCode = StatusCodes.Status200OK;
        HttpContext.Response.ContentType = "text/csv";
        HttpContext.Response.Headers.ContentDisposition =
            $"attachment; filename=investment-tax-summary-{summary.Year}.csv";

        await using var writer = new StreamWriter(HttpContext.Response.Body, new UTF8Encoding(false), BufferSize, leaveOpen: true);
        await writer.WriteLineAsync(Header);
        foreach (var disposal in summary.Disposals)
        {
            await writer.WriteLineAsync(DisposalRow(disposal, accounts, reporting));
            foreach (var lot in disposal.Lots)
            {
                await writer.WriteLineAsync(LotRow(disposal, lot, accounts, reporting));
            }
        }

        foreach (var entry in summary.CashEntries)
        {
            await writer.WriteLineAsync(CashRow(entry, accounts, reporting));
        }

        await writer.FlushAsync(ct);
    }

    private static string DisposalRow(
        TaxDisposalResponse disposal,
        IReadOnlyDictionary<Guid, string> accounts,
        string reporting) =>
        CsvCell.Row(
            CsvCell.Value("Disposal"),
            CsvCell.Value(Day(disposal.Date)),
            CsvCell.Text(accounts.GetValueOrDefault(disposal.AccountId)),
            CsvCell.Text(disposal.Symbol),
            CsvCell.Value(disposal.Currency.ToCode()),
            CsvCell.Value(Quantity(disposal.Quantity)),
            CsvCell.Value(Amount(disposal.Proceeds)),
            CsvCell.Value(Amount(disposal.CostBasis)),
            CsvCell.Value(Amount(disposal.Gain)),
            CsvCell.Value(reporting),
            CsvCell.Value(Amount(disposal.ReportingProceeds)),
            CsvCell.Value(Amount(disposal.ReportingCostBasis)),
            CsvCell.Value(Amount(disposal.ReportingGain)),
            CsvCell.Value(string.Empty),
            CsvCell.Text(disposal.Name));

    private static string LotRow(
        TaxDisposalResponse disposal,
        TaxLotResponse lot,
        IReadOnlyDictionary<Guid, string> accounts,
        string reporting) =>
        CsvCell.Row(
            CsvCell.Value("Lot"),
            CsvCell.Value(Day(disposal.Date)),
            CsvCell.Text(accounts.GetValueOrDefault(disposal.AccountId)),
            CsvCell.Text(disposal.Symbol),
            CsvCell.Value(disposal.Currency.ToCode()),
            CsvCell.Value(Quantity(lot.Quantity)),
            CsvCell.Value(string.Empty),
            CsvCell.Value(Amount(lot.Cost)),
            CsvCell.Value(string.Empty),
            CsvCell.Value(reporting),
            CsvCell.Value(string.Empty),
            CsvCell.Value(Amount(lot.ReportingCost)),
            CsvCell.Value(string.Empty),
            CsvCell.Value(Day(lot.AcquiredOn)),
            CsvCell.Value(string.Empty));

    private static string CashRow(
        TaxCashEntryResponse entry,
        IReadOnlyDictionary<Guid, string> accounts,
        string reporting) =>
        CsvCell.Row(
            CsvCell.Value(entry.Type.ToString()),
            CsvCell.Value(Day(entry.Date)),
            CsvCell.Text(accounts.GetValueOrDefault(entry.AccountId)),
            CsvCell.Text(entry.Symbol),
            CsvCell.Value(entry.Currency.ToCode()),
            CsvCell.Value(string.Empty),
            CsvCell.Value(Amount(entry.Amount)),
            CsvCell.Value(string.Empty),
            CsvCell.Value(string.Empty),
            CsvCell.Value(reporting),
            CsvCell.Value(Amount(entry.ReportingAmount)),
            CsvCell.Value(string.Empty),
            CsvCell.Value(string.Empty),
            CsvCell.Value(string.Empty),
            CsvCell.Text(entry.Description));

    private static string Day(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static string Amount(decimal value) =>
        Money.Round(value).ToString("0.00", CultureInfo.InvariantCulture);

    private static string Quantity(decimal value) => value.ToString("0.########", CultureInfo.InvariantCulture);
}
