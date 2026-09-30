using FastEndpoints;
using JxFinance.Common.Amortization;
using JxFinance.Common.Assets;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Journal;
using JxFinance.Common.Payees;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.Users.Interfaces;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Users.Services;

[RegisterService<IUserJournalSource>(LifeTime.Scoped)]
public sealed class UserJournalSource(AppDbContext db, IExchangeRateService rates, IClock clock) : IUserJournalSource
{
    public async Task<JournalBook> LoadAsync(Guid userId, CancellationToken cancellationToken)
    {
        var today = clock.Today;
        var own = db.Accounts.IgnoreQueryFilters(QueryFilters.OwnerOnly).Where(a => a.UserId == userId);
        var ownIds = own.Select(a => a.Id);
        var accounts = await own.AsNoTracking().ToListAsync(cancellationToken);
        var accountIds = accounts.Select(a => a.Id).ToHashSet();

        var transactionQuery = db.Transactions.IgnoreQueryFilters(QueryFilters.OwnerOnly).Where(t => ownIds.Contains(t.AccountId));
        var transactions = await transactionQuery.AsNoTracking()
            .OrderBy(t => t.Date).ThenBy(t => t.CreatedAt).ThenBy(t => t.Id)
            .ToListAsync(cancellationToken);
        var lines = (await db.TransactionLines.AsNoTracking()
                .Where(l => transactionQuery.Any(t => t.Id == l.TransactionId && t.IsSplit))
                .OrderBy(l => l.Id)
                .ToListAsync(cancellationToken))
            .ToLookup(l => l.TransactionId);
        var transfers = await db.Transfers.IgnoreQueryFilters(QueryFilters.OwnerOnly).AsNoTracking()
            .Where(t => ownIds.Contains(t.FromAccountId) || ownIds.Contains(t.ToAccountId))
            .OrderBy(t => t.Date).ThenBy(t => t.CreatedAt).ThenBy(t => t.Id)
            .ToListAsync(cancellationToken);
        var conversions = await db.CurrencyConversions.IgnoreQueryFilters(QueryFilters.OwnerOnly).AsNoTracking()
            .Where(c => ownIds.Contains(c.AccountId))
            .OrderBy(c => c.Date).ThenBy(c => c.CreatedAt).ThenBy(c => c.Id)
            .ToListAsync(cancellationToken);
        var investments = await db.InvestmentTransactions.IgnoreQueryFilters(QueryFilters.OwnerOnly).AsNoTracking()
            .Where(i => ownIds.Contains(i.AccountId))
            .ToListAsync(cancellationToken);

        var outsideIds = transfers.SelectMany(t => new[] { t.FromAccountId, t.ToAccountId }).Where(id => !accountIds.Contains(id)).Distinct().ToList();
        var outside = await db.Accounts.IgnoreQueryFilters().AsNoTracking()
            .Where(a => outsideIds.Contains(a.Id))
            .Select(a => new { a.Id, a.Name })
            .ToListAsync(cancellationToken);
        var securityIds = investments.Select(i => i.SecurityId).OfType<SecurityId>().Distinct().ToList();
        var securities = await db.Securities.IgnoreQueryFilters().AsNoTracking()
            .Where(s => securityIds.Contains(s.Id))
            .OrderBy(s => s.Symbol).ThenBy(s => s.Id)
            .ToListAsync(cancellationToken);
        var user = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.DisplayName, u.Email })
            .SingleAsync(cancellationToken);
        var payees = await db.PayeeNamesForAsync(transactions.Select(t => t.PayeeKey), cancellationToken);
        var categories = await CategoriesAsync(
            transactions.Where(t => !t.IsSplit).Select(t => t.CategoryId).Concat(lines.SelectMany(g => g.Select(l => l.CategoryId))),
            cancellationToken);

        var replay = Replay(investments, today);
        var (assets, assetBalances) = await AssetsAsync(userId, today, cancellationToken);
        var (debts, debtPayments, debtBalances) = await DebtsAsync(userId, transactions, today, cancellationToken);

        var journalTransactions = transactions.Select(t => new JournalTransaction(
                t.Id.Value,
                t.AccountId.Value,
                t.Date,
                t.Type,
                t.Amount,
                t.ReportingAmount,
                t.Description,
                t.IsSplit ? [.. lines[t.Id].Select(l => new JournalLine(l.CategoryId?.Value, l.Amount.Amount))] : [new JournalLine(t.CategoryId?.Value, t.Amount.Amount)],
                t.PayeeKey is { } key ? payees.GetValueOrDefault(key) : null,
                t.Note,
                debtPayments.GetValueOrDefault(t.Id)))
            .ToList();

        return new JournalBook(
            AppUser.DisplayNameOrEmail(user.DisplayName, user.Email),
            rates.ReportingCurrency,
            today,
            [.. accounts.Select(a => new JournalAccount(
                a.Id.Value,
                a.Name,
                a.Type,
                a.StartingBalance,
                DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(a.CreatedAt, clock.TimeZone).DateTime),
                replay.Oversold.TryGetValue(a.Id, out var sale) ? sale : null))],
            [.. outside.Select(a => new JournalOutsideAccount(a.Id.Value, a.Name))],
            categories,
            journalTransactions,
            [.. transfers.Select(t => new JournalTransfer(t.Id.Value, t.FromAccountId.Value, t.ToAccountId.Value, t.Date, t.Amount, t.ReceivedAmount, t.Description))],
            [.. conversions.Select(c => new JournalConversion(c.Id.Value, c.AccountId.Value, c.Date, c.FromAmount, c.ToAmount, c.Description))],
            [.. securities.Select(s => new JournalSecurity(s.Id.Value, s.Symbol, s.Currency, s.LastPrice, s.LastPriceDate, replay.Held.Contains(s.Id)))],
            replay.Entries,
            assets,
            debts,
            [
                .. CashBalances(accounts, transactions, transfers, conversions, investments, today),
                .. replay.Holdings,
                .. assetBalances,
                .. debtBalances,
            ]);
    }

    private static IEnumerable<JournalBalance> CashBalances(
        List<Account> accounts,
        List<Transaction> transactions,
        List<Transfer> transfers,
        List<CurrencyConversion> conversions,
        List<InvestmentTransaction> investments,
        DateOnly today)
    {
        var sums = accounts.ToDictionary(a => (a.Id, a.Currency), a => a.StartingBalance.Amount);

        void Add(AccountId account, Currency currency, decimal amount, DateOnly date)
        {
            if (date <= today && accounts.Any(a => a.Id == account))
            {
                sums[(account, currency)] = sums.GetValueOrDefault((account, currency)) + amount;
            }
        }

        transactions.ForEach(t => Add(t.AccountId, t.Amount.Currency, t.Type == FlowType.Income ? t.Amount.Amount : -t.Amount.Amount, t.Date));
        foreach (var transfer in transfers)
        {
            Add(transfer.FromAccountId, transfer.Amount.Currency, -transfer.Amount.Amount, transfer.Date);
            Add(transfer.ToAccountId, transfer.ReceivedAmount.Currency, transfer.ReceivedAmount.Amount, transfer.Date);
        }

        foreach (var conversion in conversions)
        {
            Add(conversion.AccountId, conversion.FromAmount.Currency, -conversion.FromAmount.Amount, conversion.Date);
            Add(conversion.AccountId, conversion.ToAmount.Currency, conversion.ToAmount.Amount, conversion.Date);
        }

        investments.ForEach(i => Add(i.AccountId, i.CashAmount.Currency, i.CashAmount.Amount, i.Date));
        return sums.Select(s => new JournalBalance(s.Key.Id.Value, s.Value, s.Key.Currency));
    }

    private static InvestmentReplay Replay(List<InvestmentTransaction> investments, DateOnly today)
    {
        var entries = new List<JournalInvestment>();
        var oversold = new Dictionary<AccountId, Guid>();
        var holdings = new List<JournalBalance>();
        var held = new HashSet<SecurityId>();
        foreach (var account in investments.GroupBy(i => i.AccountId).OrderBy(g => g.Key.Value))
        {
            var positions = new Dictionary<SecurityId, Position>();
            var costCurrencies = new Dictionary<SecurityId, Currency>();
            foreach (var entry in Portfolio.InOrder(account))
            {
                var security = entry.SecurityId;
                var lotsBefore = entry.Type == InvestmentTransactionType.Split && security is { } split && positions.TryGetValue(split, out var before)
                    ? before.Lots.ToList()
                    : null;
                if (entry.Type == InvestmentTransactionType.Buy && security is { } bought)
                {
                    costCurrencies[bought] = entry.CashAmount.Currency;
                }

                Portfolio.Apply(positions, entry);
                var sale = entry.Type == InvestmentTransactionType.Sell && security is { } sold ? positions[sold].Sales[^1] : null;
                entries.Add(new JournalInvestment(
                    entry.Id.Value,
                    entry.AccountId.Value,
                    entry.Date,
                    entry.Type,
                    security?.Value,
                    entry.Quantity,
                    entry.Price,
                    entry.CashAmount,
                    entry.Description,
                    sale?.Lots.Sum(l => l.Quantity) ?? 0m,
                    sale?.Cost ?? 0m,
                    lotsBefore,
                    security is { } traded && costCurrencies.TryGetValue(traded, out var currency) ? currency : null));
            }

            if (positions.Values.Select(p => p.FirstOversoldSale).FirstOrDefault(s => s is not null) is { } first)
            {
                oversold[account.Key] = first.Value;
            }

            foreach (var (security, position) in Portfolio.Positions(account.Where(i => i.Date <= today)))
            {
                holdings.Add(new JournalBalance(account.Key.Value, position.Quantity, null, security.Value));
                if (position.Quantity > 0)
                {
                    held.Add(security);
                }
            }
        }

        return new InvestmentReplay(entries, oversold, holdings, held);
    }

    private async Task<List<JournalCategory>> CategoriesAsync(IEnumerable<CategoryId?> referenced, CancellationToken cancellationToken)
    {
        var ids = referenced.OfType<CategoryId>().Distinct().ToList();
        var used = await db.Categories.IgnoreQueryFilters().AsNoTracking().Where(c => ids.Contains(c.Id)).ToListAsync(cancellationToken);
        var parentIds = used.Select(c => c.ParentId).OfType<CategoryId>().Except(ids).ToList();
        var parents = parentIds.Count == 0
            ? []
            : await db.Categories.IgnoreQueryFilters().AsNoTracking().Where(c => parentIds.Contains(c.Id)).ToListAsync(cancellationToken);
        return [.. used.Concat(parents).Select(c => new JournalCategory(c.Id.Value, c.Name, c.Type, c.ParentId?.Value))];
    }

    private async Task<(List<JournalAsset> Assets, List<JournalBalance> Balances)> AssetsAsync(
        Guid userId,
        DateOnly today,
        CancellationToken cancellationToken)
    {
        var query = db.Assets.IgnoreQueryFilters(QueryFilters.OwnerOnly).Where(a => a.UserId == userId);
        var assets = await query.AsNoTracking().ToListAsync(cancellationToken);
        var valuations = (await db.AssetValuations.AsNoTracking()
                .Where(v => query.Any(a => a.Id == v.AssetId))
                .ToListAsync(cancellationToken))
            .ToLookup(v => v.AssetId);
        var journal = assets.Select(a => new JournalAsset(
                a.Id.Value,
                a.Name,
                a.Type,
                a.Currency,
                [.. valuations[a.Id].Append(a.Newest).DistinctBy(v => v.Date).OrderBy(v => v.Date).Select(v => new JournalValuation(v.Date, v.Value, v.Note))],
                AssetValue.On(today, [a.Newest], a.Depreciation) ?? 0m))
            .ToList();
        return (journal, [.. journal.Select(a => new JournalBalance(a.Id, a.ValueToday, a.Currency))]);
    }

    private async Task<(List<JournalDebt> Debts, Dictionary<TransactionId, JournalDebtPayment> Payments, List<JournalBalance> Balances)> DebtsAsync(
        Guid userId,
        List<Transaction> transactions,
        DateOnly today,
        CancellationToken cancellationToken)
    {
        var query = db.Debts.IgnoreQueryFilters(QueryFilters.OwnerOnly).Where(d => d.UserId == userId);
        var debts = await query.AsNoTracking().ToListAsync(cancellationToken);
        var links = await db.DebtPayments.IgnoreQueryFilters(QueryFilters.OwnerOnly).AsNoTracking()
            .Where(p => query.Any(d => d.Id == p.DebtId && d.TracksPayments))
            .OrderBy(p => p.CreatedAt)
            .ToListAsync(cancellationToken);
        var paying = transactions.Where(t => t is { Type: FlowType.Expense, IsSplit: false, Amount.Amount: > 0 }).ToDictionary(t => t.Id);
        var currencies = debts.ToDictionary(d => d.Id, d => d.Currency);
        var foreign = links
            .Where(l => paying.TryGetValue(l.TransactionId, out var t) && t.Amount.Currency != currencies[l.DebtId])
            .Select(l => paying[l.TransactionId].Date)
            .ToList();
        var history = foreign.Count == 0 ? null : await rates.GetHistoryAsync(foreign.Min(), foreign.Max(), cancellationToken);

        var payments = new Dictionary<TransactionId, JournalDebtPayment>();
        var balances = new List<JournalBalance>();
        foreach (var debt in debts)
        {
            var tracked = new List<(TrackedPayment Payment, Transaction Transaction)>();
            foreach (var link in links.Where(l => l.DebtId == debt.Id && paying.ContainsKey(l.TransactionId)))
            {
                var paid = paying[link.TransactionId];
                var amount = paid.Amount.Currency == debt.Currency
                    ? paid.Amount.Amount
                    : history!.OnOrBefore(paid.Date).Convert(paid.Amount.Amount, paid.Amount.Currency, debt.Currency);
                if (amount is { } value)
                {
                    tracked.Add((new TrackedPayment(link.Id.Value, paid.Date, Money.Round(value), link.Kind, link.Principal), paid));
                }
            }

            var track = DebtBalance.Track(debt.OutstandingAmount.Amount, debt.AsOf, debt.InterestRate, tracked.Select(t => t.Payment));
            var principalToDate = 0m;
            foreach (var row in track.Rows.Where(r => r.Principal > 0))
            {
                var transaction = tracked.First(t => t.Payment == row.Payment).Transaction;
                var paid = transaction.Amount.Currency == debt.Currency
                    ? row.Principal
                    : Money.Round(transaction.Amount.Amount * row.Principal / row.Payment.Amount);
                payments[transaction.Id] = new JournalDebtPayment(debt.Id.Value, new Money(row.Principal, debt.Currency), paid);
                principalToDate += row.Payment.Date <= today ? row.Principal : 0m;
            }

            if (debt.AsOf <= today)
            {
                balances.Add(new JournalBalance(debt.Id.Value, principalToDate - debt.OutstandingAmount.Amount, debt.Currency));
            }
        }

        return ([.. debts.Select(d => new JournalDebt(d.Id.Value, d.Name, d.OutstandingAmount, d.AsOf))], payments, balances);
    }

    private sealed record InvestmentReplay(
        List<JournalInvestment> Entries,
        Dictionary<AccountId, Guid> Oversold,
        List<JournalBalance> Holdings,
        HashSet<SecurityId> Held);
}
