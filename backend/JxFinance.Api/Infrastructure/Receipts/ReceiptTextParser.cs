using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using JxFinance.Common;
using JxFinance.Common.Receipts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;

namespace JxFinance.Infrastructure.Receipts;

public static partial class ReceiptTextParser
{
    private const int MerchantLines = 5;

    private const string Quantity =
        @"\d+(?:[.,]\d{1,3})?\s*(?:kg|g|l|vnt\.?|pcs)?\s*[xX×*]{1,2}\s*\d+[.,]\d{2}(?:\s*(?:€|EUR|Eur)(?:\s*/\s*\p{L}+)?)?";

    private static readonly string[] Chains = Loose(
        "maxima", "rimi", "iki", "lidl", "norfa", "aibe", "barbora", "eurovaistine", "gintarine", "benu", "camelia",
        "drogas", "senukai", "ermitazas", "depo", "vynoteka", "circle", "viada", "orlen", "neste");

    private static readonly string[] TotalWords = Loose(
        "moketi", "moketina suma", "is viso", "viso", "bendra suma", "suma", "grazinti", "total", "amount due");

    private static readonly string[] SkipWords = Loose(
        "pvm", "vat ", "kasa ", "kasos", "kvitas", "kasininkas", "tarpine suma", "subtotal", "sutaup", "taskai", "moketa",
        "grynais", "graza", "mokejimo", "card ", "cash ", "change ", "suma be", "is viso nuolaid", "viso nuolaid");

    private static readonly string[] ReturnWords = Loose("grazinimas", "grazinimo", "return", "refund");

    private static readonly string[] ReceiptDiscountWords = Loose(
        "kortel", "cekio", "kvito", "visam", "kuponas", "coupon");

    private static readonly string[] VoucherWords = Loose("taromat", "voucher");

    private static readonly string[] RoundingWords = Loose("apvalinimas", "rounding");

    private static readonly string[] DiscountWords = Loose("nuolaid", "akcija", "discount", "lojalumo");

    private static readonly string[] DepositWords = Loose("uzstat", "deposit", "depozit", "pfand");

    private static readonly HashSet<string> Cities = new(StringComparer.Ordinal)
    {
        "vilnius", "kaunas", "klaipeda", "siauliai", "panevezys", "alytus", "marijampole", "mazeikiai", "jonava", "utena",
        "kedainiai", "telsiai", "taurage", "ukmerge", "visaginas", "palanga", "plunge", "kretinga", "silute", "radviliskis",
        "druskininkai", "gargzdai", "rokiskis", "birzai", "elektrenai", "trakai", "neringa", "riga", "tallinn", "warszawa",
    };

    public static Result<ReceiptResult> Parse(string text)
    {
        var lines = text.Split('\n').Select(Clean).Where(line => line.Length > 0).ToList();
        var reading = new Reading(lines.Exists(line => StartsWithAny(Loose(line), ReturnWords)));
        foreach (var line in lines)
        {
            if (reading.Take(line))
            {
                break;
            }
        }

        reading.Finish();
        if (reading.Items.Count == 0 && reading.Total is null)
        {
            return ReceiptErrors.Unreadable;
        }

        var head = lines.Take(MerchantLines).ToList();
        return new ReceiptResult(
            MerchantOf(head),
            DateOf(lines),
            CurrencyOf(lines),
            reading.Total,
            reading.IsReturn,
            1,
            1,
            reading.Items,
            reading.Adjustments,
            reading.Unread,
            AddressOf(head));
    }

    private static string Clean(string line)
    {
        var words = line.Split((char[])[' ', '\t', '\r'], StringSplitOptions.RemoveEmptyEntries);
        return JunkEdges().Replace(string.Join(' ', words), string.Empty);
    }

    private static string[] Loose(params string[] words) => [.. words.Select(Loose)];

    private static string Loose(string text)
    {
        var loose = new StringBuilder(text.Length);
        foreach (var character in ReceiptItemKey.Fold(text))
        {
            loose.Append(character switch
            {
                '0' => 'o',
                '1' or 'l' or '|' => 'i',
                '3' => 'e',
                '5' => 's',
                _ => character,
            });
        }

        return loose.ToString();
    }

    private static bool StartsWithAny(string key, string[] words) =>
        Array.Exists(words, word => key.StartsWith(word, StringComparison.Ordinal));

    private static bool StartsWithWord(string key, string[] words) =>
        Array.Exists(words, word => key == word || key.StartsWith(word + " ", StringComparison.Ordinal));

    private static bool ContainsAny(string key, string[] words) =>
        Array.Exists(words, word => key.Contains(word, StringComparison.Ordinal));

    private static int Letters(string text) => text.Count(char.IsLetter);

    private static Priced? PriceOf(string line)
    {
        var match = PricedLine().Match(line);
        if (!match.Success)
        {
            return null;
        }

        var digits = match.Groups["amount"].Value;
        if (digits.Count(char.IsDigit) < 2)
        {
            return null;
        }

        var amount = decimal.Parse(
            DigitLike().Replace(digits, found => found.Value is "O" or "o" ? "0" : "1").Replace(',', '.'),
            NumberStyles.AllowDecimalPoint,
            CultureInfo.InvariantCulture);
        return new Priced(Clean(match.Groups["label"].Value), amount, match.Groups["minus"].Success);
    }

    private static int MerchantIndex(List<string> head)
    {
        var chain = head.FindIndex(line => Loose(line).Split(' ', ',', '"', '.').Intersect(Chains).Any());
        return chain >= 0 ? chain : head.FindIndex(line => Letters(line) >= 3);
    }

    private static string? MerchantOf(List<string> head) =>
        MerchantIndex(head) is >= 0 and var index ? TextLimit.Cut(head[index], ReceiptResult.TextMaxLength) : null;

    private static string? AddressOf(List<string> head) =>
        head.Skip(MerchantIndex(head) + 1).FirstOrDefault(IsAddress) is { } address
            ? TextLimit.Cut(address, ReceiptResult.TextMaxLength)
            : null;

    private static bool IsAddress(string line) =>
        StreetNumber().IsMatch(line)
        && (PostCode().IsMatch(line) || NotLetter().Split(ReceiptItemKey.Fold(line)).Any(Cities.Contains));

    private static DateOnly? DateOf(List<string> lines)
    {
        foreach (var line in lines)
        {
            var digits = ZeroLike().Replace(line, "0");
            foreach (Match match in DateLike().Matches(digits))
            {
                var (year, month, day) = match.Groups["year"].Success
                    ? (match.Groups["year"].Value, match.Groups["month"].Value, match.Groups["day"].Value)
                    : (match.Groups["year2"].Value, match.Groups["month2"].Value, match.Groups["day2"].Value);
                if (DateOnly.TryParseExact($"{year}-{month}-{day}", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                {
                    return date;
                }
            }
        }

        return null;
    }

    private static Currency? CurrencyOf(List<string> lines)
    {
        foreach (var line in lines)
        {
            if (line.Contains('€', StringComparison.Ordinal))
            {
                return Currency.Eur;
            }

            foreach (Match match in CodeLike().Matches(line))
            {
                if (CurrencyCode.TryParse(match.Value, out var currency))
                {
                    return currency;
                }
            }
        }

        return null;
    }

    [GeneratedRegex(@"^[^\p{L}\p{N}""(]+|[^\p{L}\p{N}"")%]+$")]
    private static partial Regex JunkEdges();

    [GeneratedRegex(@"^(?<label>.*?)(?:^|(?<=[\s""“”„'‘’~|]))(?<minus>[-–—])?\s*(?<amount>[0-9OoIl]{1,6}[.,][0-9OoIl]{2})(?:\s*(?:€|EUR|Eur))?(?:\s*[A-E])?$")]
    private static partial Regex PricedLine();

    [GeneratedRegex("^" + Quantity + "$")]
    private static partial Regex QuantityLine();

    [GeneratedRegex(@"^(?<name>.*?\p{L}.*?)\s+(?<quantity>" + Quantity + ")$")]
    private static partial Regex NameWithQuantity();

    [GeneratedRegex(@"\s[A-E]$")]
    private static partial Regex EndsWithTaxLetter();

    [GeneratedRegex(@"\p{L}\.?\s+\d{1,4}[A-Za-z]?(?!\d|[.,]\d)")]
    private static partial Regex StreetNumber();

    [GeneratedRegex(@"(?<![A-Za-z])LT-\d{5}(?!\d)")]
    private static partial Regex PostCode();

    [GeneratedRegex(@"[^\p{L}]+")]
    private static partial Regex NotLetter();

    [GeneratedRegex("[OoIl]")]
    private static partial Regex DigitLike();

    [GeneratedRegex(@"(?<=\d)[Oo]|[Oo](?=\d)")]
    private static partial Regex ZeroLike();

    [GeneratedRegex(@"(?<!\d)(?:(?<year>20\d\d)[-./](?<month>\d\d)[-./](?<day>\d\d)|(?<day2>\d\d)[-./](?<month2>\d\d)[-./](?<year2>20\d\d))(?!\d)")]
    private static partial Regex DateLike();

    [GeneratedRegex(@"(?<![A-Za-z])[A-Z]{3}(?![A-Za-z])")]
    private static partial Regex CodeLike();

    private sealed record Priced(string Label, decimal Amount, bool Negative);

    private sealed class Reading(bool isReturn)
    {
        private string? pending;
        private bool afterItem;

        public bool IsReturn { get; } = isReturn;

        public decimal? Total { get; private set; }

        public List<ReceiptItem> Items { get; } = [];

        public List<ReceiptAdjustment> Adjustments { get; } = [];

        public List<string> Unread { get; } = [];

        public bool Take(string line)
        {
            if (QuantityLine().IsMatch(line))
            {
                TakeQuantity(line, null);
                return false;
            }

            var priced = PriceOf(line);
            var key = Loose(priced?.Label ?? line);
            if (StartsWithWord(key, TotalWords) && !StartsWithAny(key, SkipWords))
            {
                Total = priced?.Amount;
                return priced is not null;
            }

            if (StartsWithAny(key, SkipWords) || Letters(line) + line.Count(char.IsDigit) == 0)
            {
                return false;
            }

            if (priced is null)
            {
                Park(line);
                return false;
            }

            if (priced.Label.Length == 0 && pending is not null)
            {
                TakeQuantity(null, priced.Amount);
            }
            else if (QuantityLine().IsMatch(priced.Label))
            {
                TakeQuantity(priced.Label, priced.Amount);
            }
            else if (ContainsAny(key, VoucherWords))
            {
                Adjust(ReceiptAdjustmentKind.Voucher, priced.Label, -priced.Amount);
            }
            else if (ContainsAny(key, RoundingWords))
            {
                Adjust(ReceiptAdjustmentKind.Rounding, priced.Label, priced.Negative ? -priced.Amount : priced.Amount);
            }
            else if (ContainsAny(key, DiscountWords))
            {
                TakeDiscount(priced);
            }
            else if (ContainsAny(key, DepositWords) && afterItem)
            {
                Items[^1] = Items[^1] with { Deposit = Items[^1].Deposit + priced.Amount };
            }
            else if (priced.Negative && !IsReturn)
            {
                Adjust(ReceiptAdjustmentKind.Other, priced.Label, -priced.Amount);
            }
            else if (Letters(priced.Label) >= 2)
            {
                AddItem(priced.Label, null, priced.Amount);
            }
            else
            {
                Skip(line);
            }

            return false;
        }

        public void Finish()
        {
            if (pending is not null && Items.Count > 0)
            {
                Skip(pending);
            }
        }

        private void TakeQuantity(string? quantity, decimal? amount)
        {
            if (amount is { } total && pending is { } name)
            {
                pending = null;
                AddItem(name, quantity, total);
            }
            else if (quantity is not null && amount is null && afterItem && Items[^1].Quantity is null)
            {
                Items[^1] = Items[^1] with { Quantity = TextLimit.Cut(quantity, ReceiptResult.QuantityMaxLength) };
            }
            else
            {
                Skip(quantity ?? string.Empty);
            }
        }

        private void TakeDiscount(Priced priced)
        {
            var key = Loose(priced.Label);
            if (afterItem && !ContainsAny(key, ReceiptDiscountWords))
            {
                Items[^1] = Items[^1] with { Discount = Items[^1].Discount + priced.Amount };
                return;
            }

            Adjust(ReceiptAdjustmentKind.Discount, priced.Label, -priced.Amount);
        }

        private void AddItem(string label, string? quantity, decimal amount)
        {
            var named = NameWithQuantity().Match(label);
            var name = named.Success ? named.Groups["name"].Value : label;
            quantity ??= named.Success ? named.Groups["quantity"].Value : null;
            if (Items.Count >= ReceiptResult.MaxItems)
            {
                Skip(label);
                return;
            }

            if (pending is not null && Items.Count > 0)
            {
                Skip(pending);
            }

            pending = null;
            Items.Add(new ReceiptItem(
                TextLimit.Cut(Clean(name), ReceiptResult.TextMaxLength),
                quantity is null ? null : TextLimit.Cut(quantity, ReceiptResult.QuantityMaxLength),
                amount,
                0,
                0));
            afterItem = true;
        }

        private void Adjust(ReceiptAdjustmentKind kind, string label, decimal amount)
        {
            if (Adjustments.Count >= ReceiptResult.MaxAdjustments)
            {
                Skip(label);
                return;
            }

            Adjustments.Add(new ReceiptAdjustment(kind, TextLimit.Cut(label, ReceiptResult.TextMaxLength), amount));
            afterItem = false;
        }

        private void Park(string line)
        {
            if (pending is not null && Items.Count > 0)
            {
                Skip(pending);
            }

            pending = EndsWithTaxLetter().IsMatch(line) ? null : line;
            if (pending is null)
            {
                Skip(line);
            }

            afterItem = false;
        }

        private void Skip(string line)
        {
            if (Items.Count > 0 && Unread.Count < ReceiptResult.MaxUnreadLines)
            {
                Unread.Add(TextLimit.Cut(line, ReceiptResult.TextMaxLength));
            }

            afterItem = false;
        }
    }
}
