using System.Globalization;
using System.Text;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Common.Journal;

public static class BeancountWriter
{
    public const string OpeningBalances = "Equity:Opening-Balances";
    public const string Revaluation = "Equity:Revaluation";
    public const string OutsideAccounts = "Equity:Outside-Accounts";
    public const string Dividends = "Income:Investments:Dividends";
    public const string Interest = "Income:Investments:Interest";
    public const string Gains = "Income:Investments:Gains";
    public const string Taxes = "Expenses:Investments:Taxes";
    public const string Fees = "Expenses:Investments:Fees";
    public const string ExpensesRoot = "Expenses";
    public const string IncomeRoot = "Income";
    public const string Uncategorized = "Uncategorized";
    public const string DebtsRoot = "Liabilities:Debts";
    public const string OwnedRoot = "Assets:Owned";

    public static string Write(JournalBook book) => new Draft(book).Write();

    public static string AccountRoot(AccountType type) => type switch
    {
        AccountType.Checking => "Assets:Bank",
        AccountType.Savings => "Assets:Savings",
        AccountType.Cash => "Assets:Cash",
        AccountType.Investment => "Assets:Investments",
        _ => "Assets:Other",
    };

    public static string Text(string? text) =>
        (text ?? string.Empty)
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("\"", "\\\"", StringComparison.Ordinal)
            .Replace("\r\n", " ", StringComparison.Ordinal)
            .Replace('\r', ' ')
            .Replace('\n', ' ');

    private static string Date(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static string Money(decimal amount) => amount.ToString("0.00##########################", CultureInfo.InvariantCulture);

    private static string Quantity(decimal quantity) => quantity.ToString("0.############################", CultureInfo.InvariantCulture);

    private static string TotalCost(decimal cost, Currency currency, DateOnly? acquired = null) =>
        acquired is { } date ? $"{{{{{Money(cost)} {currency.ToCode()}, {Date(date)}}}}}" : $"{{{{{Money(cost)} {currency.ToCode()}}}}}";

    private sealed record Entry(DateOnly Date, int Order, string Text, string Key = "");

    private sealed class Draft
    {
        private const int OpenOrder = 0;
        private const int BalanceOrder = 1;
        private const int RowOrder = 2;
        private const string Indent = "  ";

        private readonly JournalBook book;
        private readonly BeancountNames names = new();
        private readonly Dictionary<Guid, string> accounts = [];
        private readonly Dictionary<Guid, string> categories = [];
        private readonly Dictionary<Guid, JournalCategory> categoryRecords;
        private readonly IReadOnlyDictionary<Guid, string> commodities;
        private readonly Dictionary<string, string> originalNames = new(StringComparer.Ordinal);
        private readonly Dictionary<string, DateOnly> openedOn = new(StringComparer.Ordinal);
        private readonly HashSet<string> used = new(StringComparer.Ordinal);
        private readonly HashSet<Guid> noneBooked;
        private readonly List<Entry> entries = [];

        public Draft(JournalBook book)
        {
            this.book = book;
            foreach (var fixedName in new[] { OpeningBalances, Revaluation, Dividends, Interest, Gains, Taxes, Fees, $"{ExpensesRoot}:{Uncategorized}", $"{IncomeRoot}:{Uncategorized}" })
            {
                names.Reserve(fixedName);
            }

            categoryRecords = book.Categories.ToDictionary(c => c.Id);
            commodities = BeancountCommodity.Names(book.Securities.Select(s => (s.Id, s.Symbol)));
            noneBooked = book.Accounts.Where(a => a.OversoldSale is not null).Select(a => a.Id).ToHashSet();
            foreach (var account in book.Accounts.OrderBy(a => a.Name, StringComparer.Ordinal).ThenBy(a => a.Id))
            {
                accounts[account.Id] = Named(AccountRoot(account.Type), account.Name);
            }

            foreach (var outside in book.OutsideAccounts.OrderBy(a => a.Name, StringComparer.Ordinal).ThenBy(a => a.Id))
            {
                accounts[outside.Id] = Named(OutsideAccounts, outside.Name);
            }

            foreach (var asset in book.Assets.OrderBy(a => a.Name, StringComparer.Ordinal).ThenBy(a => a.Id))
            {
                accounts[asset.Id] = Named($"{OwnedRoot}:{asset.Type}", asset.Name);
            }

            foreach (var debt in book.Debts.OrderBy(d => d.Name, StringComparer.Ordinal).ThenBy(d => d.Id))
            {
                accounts[debt.Id] = Named(DebtsRoot, debt.Name);
            }

            foreach (var category in book.Categories.OrderBy(c => c.Name, StringComparer.Ordinal).ThenBy(c => c.Id))
            {
                CategoryAccount(category.Id);
            }
        }

        public string Write()
        {
            AddOpenings();
            book.Assets.ToList().ForEach(AddAsset);
            book.Debts.ToList().ForEach(AddDebt);
            var currencyPrices = new Dictionary<(DateOnly, Currency), decimal>();
            foreach (var transaction in book.Transactions)
            {
                AddTransaction(transaction);
                var amount = transaction.Amount;
                if (amount.Currency != book.OperatingCurrency && amount.Amount != 0 && transaction.ReportingAmount / amount.Amount is > 0m and var rate)
                {
                    currencyPrices.TryAdd((transaction.Date, amount.Currency), decimal.Round(rate, 8));
                }
            }

            book.Transfers.ToList().ForEach(AddTransfer);
            book.Conversions.ToList().ForEach(AddConversion);
            book.Investments.ToList().ForEach(AddInvestment);

            foreach (var ((date, currency), rate) in currencyPrices)
            {
                entries.Add(new Entry(date, RowOrder, $"{Date(date)} price {currency.ToCode()} {Quantity(rate)} {book.OperatingCurrency.ToCode()}\n"));
            }

            foreach (var security in book.Securities.Where(s => s.Held))
            {
                if (security is { LastPrice: { } price, LastPriceDate: { } priced })
                {
                    entries.Add(new Entry(priced, RowOrder, $"{Date(priced)} price {commodities[security.Id]} {Quantity(price)} {security.Currency.ToCode()}\n"));
                }
            }

            var assertedOn = book.Today.AddDays(1);
            foreach (var balance in book.Balances)
            {
                var (number, commodity) = balance.SecurityId is { } security
                    ? (Quantity(balance.Amount), commodities[security])
                    : (Money(balance.Amount), balance.Currency!.Value.ToCode());
                entries.Add(new Entry(assertedOn, BalanceOrder, $"{Date(assertedOn)} balance {accounts[balance.Of]}  {number} {commodity}\n"));
            }

            AddOpens();

            var text = new StringBuilder();
            text.Append(CultureInfo.InvariantCulture, $"option \"title\" \"Jx Finance – {Text(book.Member)}\"\n");
            text.Append(CultureInfo.InvariantCulture, $"option \"operating_currency\" \"{book.OperatingCurrency.ToCode()}\"\n");
            text.Append("option \"booking_method\" \"FIFO\"\n");
            text.Append("option \"inferred_tolerance_default\" \"*:0.005\"\n");
            foreach (var entry in entries.OrderBy(e => e.Date).ThenBy(e => e.Order).ThenBy(e => e.Key, StringComparer.Ordinal))
            {
                text.Append('\n').Append(entry.Text);
            }

            return text.ToString();
        }

        private string Named(string parent, string name)
        {
            var account = names.Unique(parent, name);
            originalNames[account] = name;
            return account;
        }

        private string CategoryAccount(Guid id)
        {
            if (categories.TryGetValue(id, out var known))
            {
                return known;
            }

            var category = categoryRecords[id];
            var parent = category.ParentId is { } parentId && categoryRecords.ContainsKey(parentId)
                ? CategoryAccount(parentId)
                : Root(category.Type);
            return categories[id] = Named(parent, category.Name);
        }

        private static string Root(FlowType type) => type == FlowType.Income ? IncomeRoot : ExpensesRoot;

        private string LineAccount(Guid? categoryId, FlowType type) =>
            categoryId is { } id && categoryRecords.ContainsKey(id) ? CategoryAccount(id) : $"{Root(type)}:{Uncategorized}";

        private void AddTransaction(JournalTransaction transaction)
        {
            var currency = transaction.Amount.Currency;
            var sign = transaction.Type == FlowType.Income ? 1 : -1;
            var row = new Row(this, transaction.Date, transaction.Description, transaction.Payee);
            row.Meta("jx-id", Quoted(transaction.Id.ToString()));
            if (transaction.Note is { Length: > 0 } note)
            {
                row.Meta("note", Quoted(note));
            }

            var paid = 0m;
            if (transaction.DebtPayment is { } payment)
            {
                row.Meta("jx-category-amount", $"{Money(transaction.Amount.Amount)} {currency.ToCode()}");
                paid = payment.Paid;
            }

            row.Post(accounts[transaction.AccountId], Money(sign * transaction.Amount.Amount), currency.ToCode());
            if (transaction.DebtPayment is { } debt)
            {
                var price = debt.Principal.Currency == currency ? null : $"@@ {Money(debt.Paid)} {currency.ToCode()}";
                row.Post(accounts[debt.DebtId], Money(debt.Principal.Amount), debt.Principal.Currency.ToCode(), price);
            }

            foreach (var line in transaction.Lines)
            {
                var amount = line.Amount - paid;
                paid = 0m;
                if (amount != 0)
                {
                    row.Post(LineAccount(line.CategoryId, transaction.Type), Money(-sign * amount), currency.ToCode());
                }
            }

            row.Add();
        }

        private void AddTransfer(JournalTransfer transfer)
        {
            var row = new Row(this, transfer.Date, transfer.Description);
            row.Meta("jx-id", Quoted(transfer.Id.ToString()));
            row.Post(accounts[transfer.FromAccountId], Money(-transfer.Sent.Amount), transfer.Sent.Currency.ToCode());
            var price = transfer.Sent.Currency == transfer.Received.Currency ? null : $"@@ {Money(transfer.Sent.Amount)} {transfer.Sent.Currency.ToCode()}";
            row.Post(accounts[transfer.ToAccountId], Money(transfer.Received.Amount), transfer.Received.Currency.ToCode(), price);
            row.Add();
        }

        private void AddConversion(JournalConversion conversion)
        {
            var account = accounts[conversion.AccountId];
            var row = new Row(this, conversion.Date, conversion.Description);
            row.Meta("jx-id", Quoted(conversion.Id.ToString()));
            row.Post(account, Money(-conversion.From.Amount), conversion.From.Currency.ToCode());
            row.Post(account, Money(conversion.To.Amount), conversion.To.Currency.ToCode(), $"@@ {Money(conversion.From.Amount)} {conversion.From.Currency.ToCode()}");
            row.Add();
        }

        private void AddInvestment(JournalInvestment entry)
        {
            var account = accounts[entry.AccountId];
            var cash = entry.Cash;
            var costCurrency = entry.CostCurrency ?? cash.Currency;
            var booksNone = noneBooked.Contains(entry.AccountId);
            var symbol = entry.SecurityId is { } securityId ? commodities[securityId] : null;
            var row = new Row(this, entry.Date, entry.Description);
            row.Meta("jx-id", Quoted(entry.Id.ToString()));
            switch (entry.Type)
            {
                case InvestmentTransactionType.Buy when symbol is not null:
                    row.Post(account, Quantity(entry.Quantity), symbol, TotalCost(-cash.Amount, cash.Currency));
                    PostCash(row, account, cash);
                    break;
                case InvestmentTransactionType.Sell when symbol is not null:
                    if (entry.SoldQuantity != entry.Quantity)
                    {
                        row.Meta("jx-sold-quantity", Quantity(entry.Quantity));
                    }

                    if (entry.SoldQuantity > 0)
                    {
                        var cost = booksNone ? TotalCost(entry.SoldCost, costCurrency) : "{}";
                        var price = entry.Price > 0 ? $" @ {Quantity(entry.Price)} {cash.Currency.ToCode()}" : string.Empty;
                        row.Post(account, Quantity(-entry.SoldQuantity), symbol, cost + price);
                    }

                    PostCash(row, account, cash);
                    if (entry.SoldCost != cash.Amount)
                    {
                        row.Elide(Gains);
                    }

                    break;
                case InvestmentTransactionType.Split when symbol is not null:
                    var lots = entry.OpenLots ?? [];
                    if (lots.Count == 0)
                    {
                        return;
                    }

                    row.Meta("jx-split-ratio", Quantity(entry.Quantity));
                    var reduced = booksNone ? TotalCost(lots.Sum(l => l.Cost), costCurrency) : "{}";
                    row.Post(account, Quantity(-lots.Sum(l => l.Quantity)), symbol, reduced);
                    foreach (var lot in lots)
                    {
                        row.Post(account, Quantity(lot.Quantity * entry.Quantity), symbol, TotalCost(lot.Cost, costCurrency, lot.AcquiredOn));
                    }

                    break;
                default:
                    if (cash.Amount == 0)
                    {
                        return;
                    }

                    PostCash(row, account, cash);
                    row.Post(CounterAccount(entry.Type), Money(-cash.Amount), cash.Currency.ToCode());
                    break;
            }

            row.Add();
        }

        private static string CounterAccount(InvestmentTransactionType type) => type switch
        {
            InvestmentTransactionType.Dividend => Dividends,
            InvestmentTransactionType.Interest => Interest,
            InvestmentTransactionType.WithholdingTax => Taxes,
            InvestmentTransactionType.Fee => Fees,
            _ => Gains,
        };

        private static void PostCash(Row row, string account, Money cash)
        {
            if (cash.Amount != 0)
            {
                row.Post(account, Money(cash.Amount), cash.Currency.ToCode());
            }
        }

        private void AddAsset(JournalAsset asset)
        {
            var account = accounts[asset.Id];
            var currency = asset.Currency.ToCode();
            List<JournalValuation> valuations = asset.Valuations.Count == 0
                ? [new JournalValuation(book.Today, asset.ValueToday, null)]
                : [.. asset.Valuations.OrderBy(v => v.Date)];
            openedOn[account] = valuations[0].Date;
            Move(valuations[0].Date, "Opening balance", account, valuations[0].Value, currency, OpeningBalances, valuations[0].Note);
            for (var index = 1; index < valuations.Count; index++)
            {
                var valuation = valuations[index];
                Move(valuation.Date, "Valuation", account, valuation.Value - valuations[index - 1].Value, currency, Revaluation, valuation.Note);
            }

            if (valuations.LastOrDefault(v => v.Date <= book.Today) is { } last)
            {
                Move(book.Today, "Depreciation", account, asset.ValueToday - last.Value, currency, Revaluation);
            }
        }

        private void AddDebt(JournalDebt debt)
        {
            var account = accounts[debt.Id];
            openedOn[account] = debt.AsOf;
            Move(debt.AsOf, "Opening balance", account, -debt.Outstanding.Amount, debt.Outstanding.Currency.ToCode(), OpeningBalances);
        }

        private void AddOpenings()
        {
            var firstRows = book.Transactions.Select(t => (Id: t.AccountId, t.Date))
                .Concat(book.Transfers.SelectMany(t => new[] { (Id: t.FromAccountId, t.Date), (Id: t.ToAccountId, t.Date) }))
                .Concat(book.Conversions.Select(c => (Id: c.AccountId, c.Date)))
                .Concat(book.Investments.Select(i => (Id: i.AccountId, i.Date)))
                .GroupBy(row => row.Id)
                .ToDictionary(g => g.Key, g => g.Min(row => row.Date));
            foreach (var account in book.Accounts)
            {
                var name = accounts[account.Id];
                var opened = firstRows.TryGetValue(account.Id, out var first) && first < account.CreatedOn ? first : account.CreatedOn;
                openedOn[name] = opened;
                Move(opened, "Opening balance", name, account.StartingBalance.Amount, account.StartingBalance.Currency.ToCode(), OpeningBalances);
            }
        }

        private void Move(DateOnly date, string narration, string account, decimal amount, string currency, string counter, string? note = null)
        {
            if (amount == 0)
            {
                return;
            }

            var row = new Row(this, date, narration);
            if (note is { Length: > 0 })
            {
                row.Meta("note", Quoted(note));
            }

            row.Post(account, Money(amount), currency);
            row.Post(counter, Money(-amount), currency);
            row.Add();
        }

        private void AddOpens()
        {
            var earliest = entries.Select(e => e.Date).Concat(openedOn.Values).DefaultIfEmpty(book.Today).Min();
            foreach (var account in used.Concat(openedOn.Keys).Distinct(StringComparer.Ordinal))
            {
                var date = openedOn.GetValueOrDefault(account, earliest);
                var text = new StringBuilder($"{Date(date)} open {account}");
                var oversold = book.Accounts.FirstOrDefault(a => accounts[a.Id] == account && noneBooked.Contains(a.Id))?.OversoldSale;
                if (oversold is not null)
                {
                    text.Append(" \"NONE\"");
                }

                text.Append('\n');
                if (originalNames.TryGetValue(account, out var original))
                {
                    text.Append(CultureInfo.InvariantCulture, $"{Indent}name: {Quoted(original)}\n");
                }

                if (oversold is { } sale)
                {
                    text.Append(CultureInfo.InvariantCulture, $"{Indent}jx-oversold-sale: {Quoted(sale.ToString())}\n");
                }

                entries.Add(new Entry(date, OpenOrder, text.ToString(), account));
            }
        }

        private static string Quoted(string text) => $"\"{Text(text)}\"";

        private sealed class Row(Draft draft, DateOnly date, string? narration, string? payee = null)
        {
            private readonly StringBuilder meta = new();
            private readonly StringBuilder postings = new();

            public void Meta(string key, string value) =>
                meta.Append(CultureInfo.InvariantCulture, $"{Indent}{key}: {value}\n");

            public void Post(string account, string number, string commodity, string? annotation = null)
            {
                draft.used.Add(account);
                postings.Append(CultureInfo.InvariantCulture, $"{Indent}{account}  {number} {commodity}");
                if (annotation is not null)
                {
                    postings.Append(' ').Append(annotation);
                }

                postings.Append('\n');
            }

            public void Elide(string account)
            {
                draft.used.Add(account);
                postings.Append(CultureInfo.InvariantCulture, $"{Indent}{account}\n");
            }

            public void Add()
            {
                var header = payee is { Length: > 0 }
                    ? $"{Date(date)} * {Quoted(payee)} {Quoted(narration ?? string.Empty)}\n"
                    : $"{Date(date)} * {Quoted(narration ?? string.Empty)}\n";
                draft.entries.Add(new Entry(date, RowOrder, header + meta + postings));
            }
        }
    }
}
