using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Endpoints.Investments.GetTaxSummary;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Investments.Services;

[RegisterService<ITaxSummaryService>(LifeTime.Scoped)]
public sealed class TaxSummaryService(AppDbContext db, IExchangeRateService rates, IClock clock) : ITaxSummaryService
{
    private static readonly InvestmentTransactionType[] CashTypes =
    [
        InvestmentTransactionType.Dividend,
        InvestmentTransactionType.Interest,
        InvestmentTransactionType.WithholdingTax,
        InvestmentTransactionType.Fee,
    ];

    public async Task<TaxSummaryResponse> GetAsync(GetTaxSummaryRequest request, CancellationToken cancellationToken)
    {
        var visible = await db.Accounts
            .AsNoTracking()
            .Select(a => new { a.Id, a.Name })
            .ToDictionaryAsync(a => a.Id, a => a.Name, cancellationToken);

        var wanted = GuidList.Parse(request.AccountIds).Select(id => new AccountId(id)).ToList();
        var selected = (wanted.Count == 0 ? visible.Keys : wanted.Where(visible.ContainsKey)).ToList();

        List<InvestmentTransaction> entries = selected.Count == 0
            ? []
            : await db.InvestmentTransactions
                .AsNoTracking()
                .Where(t => selected.Contains(t.AccountId))
                .ToListAsync(cancellationToken);

        var securities = await db.Securities.AsNoTracking().ToDictionaryAsync(s => s.Id, cancellationToken);

        var availableYears = entries
            .Where(t => t.Type == InvestmentTransactionType.Sell || CashTypes.Contains(t.Type))
            .Select(t => t.Date.Year)
            .Distinct()
            .OrderDescending()
            .ToList();

        var year = request.Year ?? availableYears.FirstOrDefault(clock.Today.Year);
        var accounts = selected
            .Select(id => new TaxSummaryAccount(id.Value, visible[id]))
            .OrderBy(a => a.Name, StringComparer.OrdinalIgnoreCase)
            .ThenBy(a => a.Id)
            .ToList();

        var disposals = new List<TaxDisposalResponse>();
        var isComplete = true;
        foreach (var account in entries.Where(t => t.SecurityId is not null).GroupBy(t => t.AccountId))
        {
            foreach (var position in Portfolio.Positions(account).Values)
            {
                isComplete &= !position.IsOversold;
                var security = securities[position.SecurityId];
                foreach (var sale in position.Sales.Where(s => s.Date.Year == year))
                {
                    disposals.Add(new TaxDisposalResponse(
                        sale.Id.Value,
                        sale.Date,
                        account.Key.Value,
                        security.Id.Value,
                        security.Symbol,
                        security.Name,
                        security.Currency,
                        sale.Quantity,
                        sale.Proceeds,
                        sale.Cost,
                        sale.Gain,
                        sale.ReportingProceeds,
                        sale.ReportingCost,
                        sale.ReportingGain,
                        sale.Lots
                            .Select(lot => new TaxLotResponse(lot.AcquiredOn, lot.Quantity, lot.Cost, lot.ReportingCost))
                            .ToList()));
                }
            }
        }

        var cashEntries = entries
            .Where(t => t.Date.Year == year && CashTypes.Contains(t.Type))
            .Select(t => new TaxCashEntryResponse(
                t.Id.Value,
                t.Date,
                t.AccountId.Value,
                t.Type,
                t.SecurityId is { } id ? securities[id].Symbol : null,
                t.Description,
                t.CashAmount.Currency,
                Received(t.Type, t.CashAmount.Amount),
                Received(t.Type, t.ReportingAmount)))
            .OrderBy(e => e.Date)
            .ThenBy(e => e.Type)
            .ThenBy(e => e.Symbol, StringComparer.Ordinal)
            .ToList();

        return new TaxSummaryResponse(
            year,
            rates.ReportingCurrency,
            availableYears,
            accounts,
            Totals(disposals, cashEntries),
            disposals
                .OrderBy(d => d.Date)
                .ThenBy(d => d.Symbol, StringComparer.Ordinal)
                .ToList(),
            cashEntries,
            isComplete);
    }

    private static decimal Received(InvestmentTransactionType type, decimal amount) =>
        type is InvestmentTransactionType.WithholdingTax or InvestmentTransactionType.Fee ? -amount : amount;

    private static TaxSummaryTotals Totals(
        IReadOnlyList<TaxDisposalResponse> disposals,
        IReadOnlyList<TaxCashEntryResponse> cashEntries)
    {
        decimal Sum(InvestmentTransactionType type) =>
            cashEntries.Where(e => e.Type == type).Sum(e => e.ReportingAmount);

        return new TaxSummaryTotals(
            disposals.Sum(d => d.ReportingProceeds),
            disposals.Sum(d => d.ReportingCostBasis),
            disposals.Where(d => d.ReportingGain > 0m).Sum(d => d.ReportingGain),
            -disposals.Where(d => d.ReportingGain < 0m).Sum(d => d.ReportingGain),
            disposals.Sum(d => d.ReportingGain),
            Sum(InvestmentTransactionType.Dividend),
            Sum(InvestmentTransactionType.Interest),
            Sum(InvestmentTransactionType.WithholdingTax),
            Sum(InvestmentTransactionType.Fee));
    }
}
