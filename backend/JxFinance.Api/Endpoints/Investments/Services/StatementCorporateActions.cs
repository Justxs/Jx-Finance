using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Infrastructure.Brokers.InteractiveBrokers;

namespace JxFinance.Endpoints.Investments.Services;

internal sealed class StatementCorporateActions(
    FlexStatement statement,
    string refPrefix,
    StatementSecurities securities,
    StatementEntries entries,
    HashSet<string> entryRefs,
    StatementCounts counts)
{
    public async Task<DomainError?> ImportAsync(CancellationToken cancellationToken)
    {
        foreach (var action in statement.CorporateActions.GroupBy(a => a.Id))
        {
            var rows = action.Where(a => StatementImport.SecurityCategories.Contains(a.Instrument.AssetCategory)).ToList();
            var reference = refPrefix + action.Key;
            var type = action.First().Type;
            Result<bool> booked = rows.Count == 0 || reference.Length > StatementImport.MaxRefLength
                ? false
                : type switch
                {
                    FlexParser.ForwardSplit or FlexParser.ReverseSplit => BookSplit(rows, reference),
                    FlexParser.IssueChange => BookSymbolChange(rows, reference),
                    FlexParser.Merger => await BookMergerAsync(rows, reference, cancellationToken),
                    FlexParser.SpinOff => BookSpinOff(rows, reference),
                    _ => false,
                };
            if (booked.IsFailure)
            {
                return booked.Error;
            }

            if (!booked.Value)
            {
                counts.Skipped++;
                counts.SkippedActions[type] = counts.SkippedActions.GetValueOrDefault(type) + 1;
            }
        }

        return null;
    }

    private bool BookSplit(List<FlexCorporateAction> rows, string reference)
    {
        if (rows.Select(r => r.Ratio).FirstOrDefault(r => r is not null) is not { } ratio)
        {
            return false;
        }

        var successor = rows.OrderByDescending(r => r.Quantity).First().Instrument;
        var security = rows.Select(r => securities.Find(r.Instrument)).FirstOrDefault(s => s is not null) ?? securities.Resolve(successor);
        securities.TakeOver(security, successor, rows);
        if (!entryRefs.Add(reference))
        {
            counts.Duplicates++;
            return true;
        }

        entries.AddEntry(
            reference,
            InvestmentTransactionType.Split,
            security,
            rows[0].Date,
            new Money(0m, security.Currency),
            0m,
            rows[0].Description,
            ratio);
        counts.Splits++;
        return true;
    }

    private bool BookSymbolChange(List<FlexCorporateAction> rows, string reference)
    {
        var leaving = rows.Where(r => r.Quantity < 0m).ToList();
        var arriving = rows.Where(r => r.Quantity > 0m).ToList();
        if (leaving.Count == 0 || arriving.Count == 0)
        {
            return false;
        }

        var source = securities.Resolve(leaving[0].Instrument);
        var successor = securities.Find(arriving[0].Instrument);
        if (successor == source)
        {
            securities.TakeOver(source, arriving[0].Instrument, rows);
            return true;
        }

        successor ??= securities.Resolve(arriving[0].Instrument);
        if (successor.Currency != source.Currency)
        {
            return false;
        }

        if (!entryRefs.Add(reference))
        {
            counts.Duplicates++;
            return true;
        }

        entries.AddEntry(
            reference,
            InvestmentTransactionType.SymbolChange,
            source,
            leaving[0].Date,
            new Money(0m, source.Currency),
            0m,
            leaving[0].Description,
            -leaving.Sum(r => r.Quantity),
            related: successor);
        counts.CorporateActions++;
        return true;
    }

    private async Task<Result<bool>> BookMergerAsync(
        List<FlexCorporateAction> rows,
        string reference,
        CancellationToken cancellationToken)
    {
        var leaving = rows.Where(r => r.Quantity < 0m).ToList();
        var arriving = rows.Where(r => r.Quantity > 0m).ToList();
        if (leaving.Count == 0)
        {
            return false;
        }

        var target = securities.Resolve(leaving[0].Instrument);
        var acquirer = arriving.Count == 0 ? null : securities.Resolve(arriving[0].Instrument);
        var cash = rows.Sum(r => r.Proceeds);
        if (acquirer == target || (acquirer is not null && acquirer.Currency != target.Currency) || cash < 0m)
        {
            return false;
        }

        if (!entryRefs.Add(reference))
        {
            counts.Duplicates++;
            return true;
        }

        var value = arriving.Sum(r => Math.Abs(r.Value));
        decimal? costShare = acquirer is not null && cash > 0m && value > 0m
            ? decimal.Round(value / (value + cash) * Portfolio.WholeCost, 6)
            : null;
        if (acquirer is not null && cash > 0m && costShare is null)
        {
            counts.CostSharesMissing.Add(acquirer.Symbol);
        }

        var error = await entries.AddEntryAsync(
            reference,
            InvestmentTransactionType.Merger,
            target,
            leaving[0].Date,
            new Money(cash, target.Currency),
            leaving[0].Description,
            cancellationToken,
            -leaving.Sum(r => r.Quantity),
            related: acquirer,
            relatedQuantity: arriving.Sum(r => r.Quantity),
            costShare: costShare);
        if (error is not null)
        {
            return error;
        }

        counts.CorporateActions++;
        return true;
    }

    private bool BookSpinOff(List<FlexCorporateAction> rows, string reference)
    {
        var arriving = rows.Where(r => r.Quantity > 0m).ToList();
        if (arriving.Count == 0 || arriving[0].SourceIsin is not { } parentIsin)
        {
            return false;
        }

        var parent = securities.FindParent(parentIsin, arriving[0].Instrument.Currency);
        if (parent is null || securities.Find(arriving[0].Instrument) == parent)
        {
            return false;
        }

        var child = securities.Resolve(arriving[0].Instrument);
        if (!entryRefs.Add(reference))
        {
            counts.Duplicates++;
            return true;
        }

        entries.AddEntry(
            reference,
            InvestmentTransactionType.SpinOff,
            parent,
            arriving[0].Date,
            new Money(0m, parent.Currency),
            0m,
            arriving[0].Description,
            related: child,
            relatedQuantity: arriving.Sum(r => r.Quantity));
        counts.CostSharesMissing.Add(child.Symbol);
        counts.CorporateActions++;
        return true;
    }
}
