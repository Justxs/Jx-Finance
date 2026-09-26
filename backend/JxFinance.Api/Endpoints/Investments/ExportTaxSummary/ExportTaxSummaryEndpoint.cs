using System.Globalization;
using System.Net.Mime;
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

    public override void Configure()
    {
        Get(ApiRoutes.Investments + "/tax-summary/export");
        Group<InvestmentsGroup>();
        Description(d => d.ProducesFile(MediaTypeNames.Text.Csv));
    }

    public override async Task HandleAsync(GetTaxSummaryRequest req, CancellationToken ct)
    {
        var summary = await taxSummaryService.GetAsync(req, ct);
        var accounts = summary.Accounts.ToDictionary(a => a.Id, a => a.Name);
        var reporting = summary.ReportingCurrency.ToCode();

        await using var writer = HttpContext.StartCsv($"investment-tax-summary-{summary.Year}.csv");
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
            CsvCell.Date(disposal.Date),
            CsvCell.Text(accounts.GetValueOrDefault(disposal.AccountId)),
            CsvCell.Text(disposal.Symbol),
            CsvCell.Value(disposal.Currency.ToCode()),
            CsvCell.Value(Quantity(disposal.Quantity)),
            Amount(disposal.Proceeds),
            Amount(disposal.CostBasis),
            Amount(disposal.Gain),
            CsvCell.Value(reporting),
            Amount(disposal.ReportingProceeds),
            Amount(disposal.ReportingCostBasis),
            Amount(disposal.ReportingGain),
            CsvCell.Value(string.Empty),
            CsvCell.Text(disposal.Name));

    private static string LotRow(
        TaxDisposalResponse disposal,
        TaxLotResponse lot,
        IReadOnlyDictionary<Guid, string> accounts,
        string reporting) =>
        CsvCell.Row(
            CsvCell.Value("Lot"),
            CsvCell.Date(disposal.Date),
            CsvCell.Text(accounts.GetValueOrDefault(disposal.AccountId)),
            CsvCell.Text(disposal.Symbol),
            CsvCell.Value(disposal.Currency.ToCode()),
            CsvCell.Value(Quantity(lot.Quantity)),
            CsvCell.Value(string.Empty),
            Amount(lot.Cost),
            CsvCell.Value(string.Empty),
            CsvCell.Value(reporting),
            CsvCell.Value(string.Empty),
            Amount(lot.ReportingCost),
            CsvCell.Value(string.Empty),
            CsvCell.Date(lot.AcquiredOn),
            CsvCell.Value(string.Empty));

    private static string CashRow(
        TaxCashEntryResponse entry,
        IReadOnlyDictionary<Guid, string> accounts,
        string reporting) =>
        CsvCell.Row(
            CsvCell.Value(entry.Type.ToString()),
            CsvCell.Date(entry.Date),
            CsvCell.Text(accounts.GetValueOrDefault(entry.AccountId)),
            CsvCell.Text(entry.Symbol),
            CsvCell.Value(entry.Currency.ToCode()),
            CsvCell.Value(string.Empty),
            Amount(entry.Amount),
            CsvCell.Value(string.Empty),
            CsvCell.Value(string.Empty),
            CsvCell.Value(reporting),
            Amount(entry.ReportingAmount),
            CsvCell.Value(string.Empty),
            CsvCell.Value(string.Empty),
            CsvCell.Value(string.Empty),
            CsvCell.Text(entry.Description));

    private static string Amount(decimal value) => CsvCell.Money(Money.Round(value));

    private static string Quantity(decimal value) => value.ToString("0.########", CultureInfo.InvariantCulture);
}
