using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace JxFinance.Tests.Support.Journal;

public sealed record CheckedPosting(string Account, decimal? Number, string? Commodity, string? Cost, string? Price);

public sealed record CheckedTransaction(
    DateOnly Date,
    string? Payee,
    string Narration,
    IReadOnlyDictionary<string, string> Meta,
    IReadOnlyList<CheckedPosting> Postings);

public sealed record CheckedAssertion(DateOnly Date, string Account, decimal Number, string Commodity);

public sealed record CheckedOpen(DateOnly Date, string Account, string? Booking, IReadOnlyDictionary<string, string> Meta);

public sealed record CheckedJournal(
    IReadOnlyList<string> Errors,
    IReadOnlyDictionary<string, string> Options,
    IReadOnlyList<CheckedOpen> Opens,
    IReadOnlyList<CheckedTransaction> Transactions,
    IReadOnlyList<CheckedAssertion> Assertions)
{
    public CheckedOpen Open(string name) => Opens.Single(o => o.Meta.GetValueOrDefault("name") == name);
}

public static partial class JournalChecker
{
    private const string Fifo = "FIFO";
    private const string None = "NONE";
    private const string ToleranceOption = "inferred_tolerance_default";

    private static readonly HashSet<string> KnownOptions = new(StringComparer.Ordinal)
    {
        "title",
        "operating_currency",
        "booking_method",
        ToleranceOption,
    };

    private static readonly HashSet<string> BookingMethods = new(StringComparer.Ordinal)
    {
        "STRICT",
        "STRICT_WITH_SIZE",
        Fifo,
        "LIFO",
        "HIFO",
        None,
    };

    public static CheckedJournal Accepted(string text)
    {
        var journal = Check(text);
        Assert.True(journal.Errors.Count == 0, string.Join('\n', journal.Errors) + "\n\n" + text);
        return journal;
    }

    public static CheckedJournal Check(string text)
    {
        var parsed = new Parser(text);
        parsed.Run();
        var ledger = new Ledger(parsed);
        foreach (var directive in parsed.Directives.OrderBy(d => d.Date).ThenBy(d => d.SortOrder).ThenBy(d => d.Line))
        {
            ledger.Apply(directive);
        }

        return new CheckedJournal(
            [.. parsed.Errors, .. ledger.Errors],
            parsed.Options,
            [.. parsed.Directives.OfType<OpenDirective>().Select(o => new CheckedOpen(o.Date, o.Account, o.Booking, o.Meta))],
            [.. parsed.Directives.OfType<TransactionDirective>().Select(t => new CheckedTransaction(
                t.Date,
                t.Payee,
                t.Narration,
                t.Meta,
                [.. t.Postings.Select(p => new CheckedPosting(p.Account, p.Number, p.Commodity, p.CostText, p.PriceText))]))],
            [.. parsed.Directives.OfType<BalanceDirective>().Select(b => new CheckedAssertion(b.Date, b.Account, b.Number, b.Commodity))]);
    }

    public static bool IsAccount(string account) => AccountPattern().IsMatch(account);

    public static bool IsCommodity(string commodity) => CommodityPattern().IsMatch(commodity);

    private static decimal Tolerance(decimal number)
    {
        return number.Scale == 0 ? 0m : 1m / Pow10(number.Scale);
    }

    private static decimal Pow10(int power)
    {
        var value = 1m;
        for (var i = 0; i < power; i++)
        {
            value *= 10m;
        }

        return value;
    }

    private static decimal? ParseNumber(string text) =>
        NumberPattern().IsMatch(text) ? decimal.Parse(text, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture) : null;

    [GeneratedRegex(@"^(Assets|Liabilities|Equity|Income|Expenses)(:[A-Z0-9][A-Za-z0-9-]*)+$")]
    private static partial Regex AccountPattern();

    [GeneratedRegex(@"^[A-Z][A-Z0-9'._-]{0,22}[A-Z0-9]$")]
    private static partial Regex CommodityPattern();

    [GeneratedRegex(@"^-?[0-9]+(\.[0-9]+)?$")]
    private static partial Regex NumberPattern();

    [GeneratedRegex(@"^(?<date>\d{4}-\d{2}-\d{2}) (?<rest>.*)$")]
    private static partial Regex DatedPattern();

    [GeneratedRegex(@"^ {2,}(?<key>[a-z][a-zA-Z0-9_-]*): (?<value>.+)$")]
    private static partial Regex MetaPattern();

    [GeneratedRegex(@"^ {2,}(?<account>[^\s;]+)(?: {2,}(?<number>\S+) (?<commodity>\S+)(?: (?<cost>\{\{[^{}]*\}\}|\{[^{}]*\}))?(?: (?<op>@@|@) (?<pnumber>\S+) (?<pcommodity>\S+))?)?$")]
    private static partial Regex PostingPattern();

    [GeneratedRegex(@"^option (?<key>""(?:[^""\\]|\\.)*"") (?<value>""(?:[^""\\]|\\.)*"")$")]
    private static partial Regex OptionPattern();

    private abstract record Directive(DateOnly Date, int Line, int SortOrder)
    {
        public Dictionary<string, string> Meta { get; } = new(StringComparer.Ordinal);
    }

    private sealed record OpenDirective(DateOnly Date, int Line, string Account, string? Booking) : Directive(Date, Line, -2);

    private sealed record BalanceDirective(DateOnly Date, int Line, string Account, decimal Number, string Commodity) : Directive(Date, Line, -1);

    private sealed record PriceDirective(DateOnly Date, int Line) : Directive(Date, Line, 0);

    private sealed record TransactionDirective(DateOnly Date, int Line, string? Payee, string Narration) : Directive(Date, Line, 0)
    {
        public List<Posting> Postings { get; } = [];
    }

    private sealed record CostSpec(decimal? PerUnit, decimal? Total, string? Currency, DateOnly? Date);

    private sealed record Posting(
        int Line,
        string Account,
        decimal? Number,
        string? Commodity,
        CostSpec? Cost,
        string? CostText,
        string? PriceOperator,
        decimal? PriceNumber,
        string? PriceCommodity)
    {
        public string? PriceText => PriceOperator is null ? null : $"{PriceOperator} {PriceNumber?.ToString(CultureInfo.InvariantCulture)} {PriceCommodity}";
    }

    private sealed record Lot(decimal Units, decimal PerUnit, string Currency, DateOnly Date);

    private sealed class Parser(string text)
    {
        public List<string> Errors { get; } = [];

        public Dictionary<string, string> Options { get; } = new(StringComparer.Ordinal);

        public List<Directive> Directives { get; } = [];

        public void Run()
        {
            if (text.Contains('\r', StringComparison.Ordinal))
            {
                Errors.Add("The journal must use LF line endings.");
            }

            Directive? current = null;
            var lines = text.Split('\n');
            for (var index = 0; index < lines.Length; index++)
            {
                var line = lines[index];
                var number = index + 1;
                if (line.Length == 0)
                {
                    current = null;
                }
                else if (line.StartsWith(';'))
                {
                    continue;
                }
                else if (line.StartsWith(' '))
                {
                    Indented(current, line, number);
                }
                else if (line.StartsWith("option ", StringComparison.Ordinal))
                {
                    Option(line, number);
                    current = null;
                }
                else
                {
                    current = Dated(line, number);
                }
            }
        }

        private void Error(int line, string message) => Errors.Add($"Line {line}: {message}");

        private void Option(string line, int number)
        {
            var match = OptionPattern().Match(line);
            if (!match.Success || Unquote(match.Groups["key"].Value) is not { } key || Unquote(match.Groups["value"].Value) is not { } value)
            {
                Error(number, $"Invalid option: {line}");
                return;
            }

            if (!KnownOptions.Contains(key))
            {
                Error(number, $"Unknown option {key}.");
            }

            if (key == "booking_method" && !BookingMethods.Contains(value))
            {
                Error(number, $"Invalid booking method {value}.");
            }

            if (key == "operating_currency" && !IsCommodity(value))
            {
                Error(number, $"Invalid operating currency {value}.");
            }

            if (key == ToleranceOption && (value.Split(':') is not [var currency, var tolerance] || (currency != "*" && !IsCommodity(currency)) || ParseNumber(tolerance) is null))
            {
                Error(number, $"Invalid tolerance {value}.");
            }

            Options[key] = value;
        }

        private Directive? Dated(string line, int number)
        {
            var match = DatedPattern().Match(line);
            if (!match.Success || !DateOnly.TryParseExact(match.Groups["date"].Value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                Error(number, $"Not a directive: {line}");
                return null;
            }

            var rest = match.Groups["rest"].Value;
            var words = rest.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            Directive? directive = words switch
            {
                ["open", var account] => Open(number, date, account, null),
                ["open", var account, var booking] => Open(number, date, account, Unquote(booking)),
                ["balance", var account, var amount, var commodity] => Balance(number, date, account, amount, commodity),
                ["price", var commodity, var amount, var quote] => Price(number, date, commodity, amount, quote),
                ["*" or "!", ..] => Transaction(number, date, rest[1..].Trim()),
                _ => null,
            };
            if (directive is null)
            {
                Error(number, $"Unsupported or invalid directive: {line}");
                return null;
            }

            Directives.Add(directive);
            return directive;
        }

        private static OpenDirective? Open(int line, DateOnly date, string account, string? booking)
        {
            if (!IsAccount(account) || (booking is not null && !BookingMethods.Contains(booking)))
            {
                return null;
            }

            return new OpenDirective(date, line, account, booking);
        }

        private static BalanceDirective? Balance(int line, DateOnly date, string account, string amount, string commodity) =>
            IsAccount(account) && ParseNumber(amount) is { } number && IsCommodity(commodity)
                ? new BalanceDirective(date, line, account, number, commodity)
                : null;

        private static PriceDirective? Price(int line, DateOnly date, string commodity, string amount, string quote) =>
            IsCommodity(commodity) && IsCommodity(quote) && ParseNumber(amount) is >= 0m
                ? new PriceDirective(date, line)
                : null;

        private static TransactionDirective? Transaction(int line, DateOnly date, string header)
        {
            var strings = new List<string>();
            var rest = header;
            while (rest.Length > 0)
            {
                if (ReadString(rest) is not { } read)
                {
                    return null;
                }

                strings.Add(read.Value);
                rest = read.After.TrimStart(' ');
            }

            return strings switch
            {
                [var narration] => new TransactionDirective(date, line, null, narration),
                [var payee, var narration] => new TransactionDirective(date, line, payee, narration),
                _ => null,
            };
        }

        private void Indented(Directive? current, string line, int number)
        {
            if (current is null)
            {
                Error(number, "An indented line outside a directive.");
                return;
            }

            if (MetaPattern().Match(line) is { Success: true } meta)
            {
                var value = meta.Groups["value"].Value;
                if (current is TransactionDirective { Postings.Count: > 0 })
                {
                    Error(number, "Transaction metadata must come before the postings.");
                }

                if (!IsMetaValue(value))
                {
                    Error(number, $"Invalid metadata value: {value}");
                }

                current.Meta[meta.Groups["key"].Value] = Unquote(value) ?? value;
                return;
            }

            if (current is not TransactionDirective transaction)
            {
                Error(number, $"Unexpected line: {line}");
                return;
            }

            var match = PostingPattern().Match(line);
            if (!match.Success)
            {
                Error(number, $"Invalid posting: {line}");
                return;
            }

            var account = match.Groups["account"].Value;
            if (!IsAccount(account))
            {
                Error(number, $"Invalid account name {account}.");
            }

            if (!match.Groups["number"].Success)
            {
                transaction.Postings.Add(new Posting(number, account, null, null, null, null, null, null, null));
                return;
            }

            var units = ParseNumber(match.Groups["number"].Value);
            var commodity = match.Groups["commodity"].Value;
            if (units is null || !IsCommodity(commodity))
            {
                Error(number, $"Invalid amount in {line}");
                return;
            }

            var cost = match.Groups["cost"].Success ? Cost(match.Groups["cost"].Value) : null;
            if (match.Groups["cost"].Success && cost is null)
            {
                Error(number, $"Invalid cost in {line}");
                return;
            }

            decimal? priceNumber = null;
            if (match.Groups["op"].Success)
            {
                priceNumber = ParseNumber(match.Groups["pnumber"].Value);
                if (priceNumber is not >= 0m || !IsCommodity(match.Groups["pcommodity"].Value))
                {
                    Error(number, $"Invalid or negative price in {line}");
                    return;
                }
            }

            transaction.Postings.Add(new Posting(
                number,
                account,
                units,
                commodity,
                cost,
                match.Groups["cost"].Success ? match.Groups["cost"].Value : null,
                match.Groups["op"].Success ? match.Groups["op"].Value : null,
                priceNumber,
                match.Groups["op"].Success ? match.Groups["pcommodity"].Value : null));
        }

        private static CostSpec? Cost(string text)
        {
            var total = text.StartsWith("{{", StringComparison.Ordinal);
            var inner = total ? text[2..^2] : text[1..^1];
            if (inner.Trim().Length == 0)
            {
                return total ? null : new CostSpec(null, null, null, null);
            }

            var parts = inner.Split(',').Select(p => p.Trim()).ToList();
            if (parts[0].Split(' ') is not [var amount, var currency] || ParseNumber(amount) is not >= 0m || !IsCommodity(currency))
            {
                return null;
            }

            DateOnly? date = null;
            if (parts.Count == 2 && DateOnly.TryParseExact(parts[1], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                date = parsed;
            }
            else if (parts.Count != 1)
            {
                return null;
            }

            var number = ParseNumber(amount)!.Value;
            return total ? new CostSpec(null, number, currency, date) : new CostSpec(number, null, currency, date);
        }

        private static bool IsMetaValue(string value) =>
            Unquote(value) is not null
            || ParseNumber(value) is not null
            || (value.Split(' ') is [var number, var commodity] && ParseNumber(number) is not null && IsCommodity(commodity));

        private static string? Unquote(string value) =>
            ReadString(value) is { After.Length: 0 } read ? read.Value : null;

        private static (string Value, string After)? ReadString(string text)
        {
            if (!text.StartsWith('"'))
            {
                return null;
            }

            var value = new StringBuilder();
            for (var index = 1; index < text.Length; index++)
            {
                var letter = text[index];
                if (letter == '"')
                {
                    return (value.ToString(), text[(index + 1)..]);
                }

                if (letter == '\\')
                {
                    if (index + 1 >= text.Length)
                    {
                        return null;
                    }

                    index++;
                    letter = text[index];
                }

                value.Append(letter);
            }

            return null;
        }
    }

    private sealed class Ledger
    {
        private readonly Dictionary<string, OpenDirective> open = new(StringComparer.Ordinal);
        private readonly Dictionary<(string Account, string Commodity), decimal> units = [];
        private readonly Dictionary<(string Account, string Commodity), List<Lot>> lots = [];
        private readonly decimal defaultTolerance;
        private readonly string defaultBooking;

        public Ledger(Parser parsed)
        {
            defaultTolerance = DefaultTolerance(parsed.Options);
            defaultBooking = parsed.Options.GetValueOrDefault("booking_method", "STRICT");
            foreach (var opened in parsed.Directives.OfType<OpenDirective>())
            {
                if (!open.TryAdd(opened.Account, opened))
                {
                    Error(opened, $"Duplicate open of {opened.Account}.");
                }
            }
        }

        public List<string> Errors { get; } = [];

        public void Apply(Directive directive)
        {
            switch (directive)
            {
                case BalanceDirective balance:
                    Active(balance, balance.Account);
                    var actual = units
                        .Where(u => u.Key.Commodity == balance.Commodity && (u.Key.Account == balance.Account || u.Key.Account.StartsWith(balance.Account + ":", StringComparison.Ordinal)))
                        .Sum(u => u.Value);
                    if (Math.Abs(actual - balance.Number) > Tolerance(balance.Number))
                    {
                        Error(balance, $"Balance failed for {balance.Account}: expected {balance.Number} {balance.Commodity}, accumulated {actual} {balance.Commodity}.");
                    }

                    break;
                case TransactionDirective transaction:
                    Book(transaction);
                    break;
                default:
                    break;
            }
        }

        private static decimal DefaultTolerance(Dictionary<string, string> options) =>
            options.TryGetValue(ToleranceOption, out var value) && value.Split(':') is ["*", var tolerance] && ParseNumber(tolerance) is { } parsed
                ? parsed
                : 0m;

        private void Error(Directive directive, string message) => Errors.Add($"Line {directive.Line}: {message}");

        private void Active(Directive directive, string account)
        {
            if (!open.TryGetValue(account, out var opened))
            {
                Error(directive, $"{account} is used but never opened.");
            }
            else if (opened.Date > directive.Date)
            {
                Error(directive, $"{account} is used on {directive.Date:yyyy-MM-dd} before it opens on {opened.Date:yyyy-MM-dd}.");
            }
        }

        private string BookingOf(string account) =>
            open.TryGetValue(account, out var opened) && opened.Booking is { } booking ? booking : defaultBooking;

        private void Book(TransactionDirective transaction)
        {
            if (transaction.Postings.Count == 0)
            {
                Error(transaction, "A transaction without postings.");
                return;
            }

            var residual = new Dictionary<string, decimal>(StringComparer.Ordinal);
            var tolerances = new Dictionary<string, decimal>(StringComparer.Ordinal);
            var elided = new List<Posting>();
            foreach (var posting in transaction.Postings)
            {
                Active(transaction, posting.Account);
                if (posting.Number is not { } number || posting.Commodity is not { } commodity)
                {
                    elided.Add(posting);
                    continue;
                }

                if (number.Scale > 0)
                {
                    var tolerance = 0.5m / Pow10(number.Scale);
                    tolerances[commodity] = Math.Max(tolerance, tolerances.GetValueOrDefault(commodity));
                }

                if (Weight(transaction, posting, number, commodity) is not { } weight)
                {
                    return;
                }

                residual[weight.Currency] = residual.GetValueOrDefault(weight.Currency) + weight.Amount;
                Hold(posting.Account, commodity, number);
            }

            if (elided.Count > 1)
            {
                Error(transaction, "More than one posting without an amount.");
                return;
            }

            if (elided.Count == 1)
            {
                foreach (var (currency, amount) in residual.Where(r => r.Value != 0))
                {
                    Hold(elided[0].Account, currency, -amount);
                }

                return;
            }

            foreach (var (currency, amount) in residual)
            {
                var tolerance = tolerances.TryGetValue(currency, out var inferred) ? inferred : defaultTolerance;
                if (Math.Abs(amount) > tolerance)
                {
                    Error(transaction, $"Transaction does not balance: {amount} {currency}.");
                }
            }
        }

        private void Hold(string account, string commodity, decimal number) =>
            units[(account, commodity)] = units.GetValueOrDefault((account, commodity)) + number;

        private (decimal Amount, string Currency)? Weight(TransactionDirective transaction, Posting posting, decimal number, string commodity)
        {
            if (posting.Cost is { } cost)
            {
                return Booked(transaction, posting, number, commodity, cost);
            }

            return posting.PriceOperator switch
            {
                "@" => (number * posting.PriceNumber!.Value, posting.PriceCommodity!),
                "@@" => (Math.Sign(number) * posting.PriceNumber!.Value, posting.PriceCommodity!),
                _ => (number, commodity),
            };
        }

        private (decimal Amount, string Currency)? Booked(TransactionDirective transaction, Posting posting, decimal number, string commodity, CostSpec cost)
        {
            var key = (posting.Account, commodity);
            var held = lots.TryGetValue(key, out var found) ? found : lots[key] = [];
            var booking = BookingOf(posting.Account);
            var reduces = booking != None && held.Any(l => Math.Sign(l.Units) == -Math.Sign(number));
            if (!reduces)
            {
                if (cost.Currency is not { } currency || (cost.PerUnit is null && cost.Total is null) || number == 0)
                {
                    Error(transaction, $"Line {posting.Line}: an augmentation of {commodity} needs a cost.");
                    return null;
                }

                var perUnit = cost.PerUnit ?? (cost.Total!.Value / Math.Abs(number));
                var date = cost.Date ?? transaction.Date;
                var same = held.FindIndex(l => l.PerUnit == perUnit && l.Currency == currency && l.Date == date);
                if (same >= 0)
                {
                    held[same] = held[same] with { Units = held[same].Units + number };
                    held.RemoveAll(l => l.Units == 0);
                }
                else
                {
                    held.Add(new Lot(number, perUnit, currency, date));
                }

                return (number * perUnit, currency);
            }

            var matches = held
                .Where(l => (cost.Currency is null || l.Currency == cost.Currency)
                    && (cost.PerUnit is null || l.PerUnit == cost.PerUnit)
                    && (cost.Total is null || l.PerUnit == cost.Total.Value / Math.Abs(number))
                    && (cost.Date is null || l.Date == cost.Date))
                .ToList();
            if (matches.Count == 0)
            {
                Error(transaction, $"Line {posting.Line}: no position of {commodity} in {posting.Account} matches {posting.CostText}.");
                return null;
            }

            if (matches.Select(l => l.Currency).Distinct(StringComparer.Ordinal).Count() > 1)
            {
                Error(transaction, $"Line {posting.Line}: the matched lots of {commodity} have different cost currencies.");
                return null;
            }

            var remaining = Math.Abs(number);
            var weight = 0m;
            foreach (var lot in matches.OrderBy(l => l.Date))
            {
                if (remaining <= 0)
                {
                    break;
                }

                var size = Math.Min(Math.Abs(lot.Units), remaining);
                weight -= size * lot.PerUnit;
                remaining -= size;
                var index = held.IndexOf(lot);
                held[index] = lot with { Units = lot.Units - (Math.Sign(lot.Units) * size) };
            }

            held.RemoveAll(l => l.Units == 0);
            if (remaining != 0)
            {
                Error(transaction, $"Line {posting.Line}: not enough {commodity} in {posting.Account} to reduce {number}.");
                return null;
            }

            return (Math.Sign(number) == -1 ? weight : -weight, matches[0].Currency);
        }
    }
}
