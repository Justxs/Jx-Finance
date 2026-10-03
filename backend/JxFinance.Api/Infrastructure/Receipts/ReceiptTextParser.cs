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
    private const int MerchantLines = 6;

    private const int InvoiceHeadLines = 20;

    private const int WrappedNameLength = 40;

    private const string Quantity =
        @"(?:\d+(?:[.,]\d{1,3})?\s*(?:kg|g|l|vnt\.?|pcs)?\s*[xX×*]{1,2}\s*\d+[.,]\d{2}(?:\s*(?:€|EUR|Eur)(?:\s*/\s*\p{L}+)?)?"
        + @"|\d+[.,]\d{2}\s*[xX×*]\s*\d+(?:[.,]\d{1,3})?\s*(?:kg|g|l|vnt\.?|pcs))";

    private const string Column = @"(?:\d+(?:[.,]\d+)?\s?(?:%|€|EUR)?|vnt\.?|kg|val\.?|h|m[eė]n\.?|kompl\.?|m2|m3|kwh|pcs|pc\.?)";

    private static readonly string[] Months =
    [
        "sausio", "vasario", "kovo", "balandzio", "geguzes", "birzelio", "liepos", "rugpjucio", "rugsejo", "spalio", "lapkricio", "gruodzio",
    ];

    private static readonly string[] Chains = Loose(
        "maxima", "rimi", "iki", "lidl", "norfa", "aibe", "barbora", "eurovaistine", "gintarine", "benu", "camelia",
        "drogas", "senukai", "ermitazas", "depo", "vynoteka", "circle", "viada", "orlen", "neste");

    private static readonly string[] TotalWords = Loose(
        "moketi", "apmoketi", "moketina suma", "is viso", "viso", "bendra suma", "suma", "kvito suma", "pirkiniu suma", "grazinti",
        "total", "grand total", "invoice total", "amount due", "balance due");

    private static readonly string[] SkipWords = Loose(
        "pvm", "vat ", "kasa ", "kasos", "kvitas", "kasininkas", "tarpine suma", "subtotal", "sutaup", "taskai", "moketa",
        "grynais", "graza", "mokejimo", "card ", "cash ", "change ", "suma be", "is viso nuolaid", "viso nuolaid", "is viso be",
        "viso be", "is viso pvm", "viso pvm", "total excl", "total net", "total without", "total vat", "total tax", "net total",
        "net amount", "amount excl", "amount without", "moketi iki", "apmoketi iki", "apmokejimo", "be pvm", "ideta",
        "suteiktos naudos", "aciu nuolaidos", "pritaikytos", "depozitas");

    private static readonly string[] InvoiceWords = Loose(
        "pvm saskaita faktura", "saskaita faktura", "saskaita-faktura", "isankstine saskaita", "invoice", "tax invoice");

    private static readonly string[] TableWords = Loose(
        "pavadinimas", "kiekis", "kaina", "mato", "matavimo", "suma", "description", "qty", "quantity", "unit price", "amount");

    private static readonly string[] VatWords = Loose("pvm", "vat", "tax", "total vat", "total tax", "is viso pvm", "viso pvm");

    private static readonly string[] NotVatWords = Loose("be pvm", "apmokestinam", "taxable", "base");

    private static readonly string[] ReturnWords = Loose("grazinimas", "grazinimo", "return", "refund");

    private static readonly string[] ReceiptDiscountWords = Loose(
        "kortel", "cekio", "kvito", "visam", "kuponas", "coupon");

    private static readonly string[] VoucherWords = Loose("taromat", "voucher");

    private static readonly string[] RoundingWords = Loose("apvalinimas", "rounding");

    private static readonly string[] DiscountWords = Loose("nuolaid", "nukainojim", "akcija", "discount", "lojalumo");

    private static readonly string[] DepositWords = Loose("uzstat", "deposit", "depozit", "pfand");

    private static readonly HashSet<string> Cities = new(StringComparer.Ordinal)
    {
        "vilnius", "kaunas", "klaipeda", "siauliai", "panevezys", "alytus", "marijampole", "mazeikiai", "jonava", "utena",
        "kedainiai", "telsiai", "taurage", "ukmerge", "visaginas", "palanga", "plunge", "kretinga", "silute", "radviliskis",
        "druskininkai", "gargzdai", "rokiskis", "birzai", "elektrenai", "trakai", "neringa", "riga", "tallinn", "warszawa",
    };

    public static Result<ReceiptResult> Parse(string text)
    {
        var lines = text.Split('\n').SelectMany(line => LabelledAmounts().Split(line)).Select(Clean).Where(line => line.Length > 0).ToList();
        var isInvoice = lines.Exists(line => StartsWithAny(Loose(line), InvoiceWords));
        var table = isInvoice ? lines.FindIndex(IsTableHeader) : -1;
        var reading = new Reading(lines.Exists(line => StartsWithAny(Loose(line), ReturnWords)), isInvoice);
        foreach (var line in lines.Skip(table + 1))
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

        var dates = DatesOf(lines);
        if (isInvoice)
        {
            var invoiceHead = lines.Take(table >= 0 ? table : InvoiceHeadLines).ToList();
            var due = DueDateOf(lines, dates);
            return new ReceiptResult(
                SellerOf(invoiceHead),
                IssueDateOf(lines, dates, due),
                CurrencyOf(lines),
                reading.Total,
                reading.IsReturn,
                1,
                1,
                reading.Items,
                reading.Adjustments,
                reading.Unread,
                null,
                true,
                InvoiceNumberOf(invoiceHead),
                due?.Date);
        }

        var head = lines.Where(line => !line.Contains('@', StringComparison.Ordinal)).Take(MerchantLines).ToList();
        return new ReceiptResult(
            MerchantOf(head),
            dates.FirstOrDefault()?.Date,
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

    private static bool IsTableHeader(string line)
    {
        var key = Loose(line);
        return PriceOf(line) is null && TableWords.Count(word => key.Contains(word, StringComparison.Ordinal)) >= 2;
    }

    private static string? SellerOf(List<string> head)
    {
        for (var index = 0; index < head.Count; index++)
        {
            var label = SellerLabel().Match(head[index]);
            if (!label.Success)
            {
                continue;
            }

            var seller = new[] { label.Groups["rest"].Value }
                .Concat(head.Skip(index + 1).Take(1))
                .Select(BeforeBuyer)
                .FirstOrDefault(name => Letters(name) >= 3);
            if (seller is not null)
            {
                return TextLimit.Cut(seller, ReceiptResult.TextMaxLength);
            }
        }

        var company = head.Find(line => CompanyForm().IsMatch(line) && !BuyerLabel().IsMatch(line) && !StartsWithAny(Loose(line), InvoiceWords));
        return company is not null
            ? TextLimit.Cut(company, ReceiptResult.TextMaxLength)
            : MerchantOf([.. head.Where(line => !StartsWithAny(Loose(line), InvoiceWords))]);
    }

    private static string BeforeBuyer(string text)
    {
        var buyer = BuyerLabel().Match(text);
        return Clean(buyer.Success ? text[..buyer.Index] : text);
    }

    private static bool IsRow(string label) =>
        ColumnsOnly().IsMatch(label) && ColumnToken().Matches(label).Count(match => match.Value.Any(char.IsDigit)) >= 2;

    private static bool Continues(string name, string label) =>
        char.IsLower(label[0]) || (name.Length >= WrappedNameLength && !IsRow(label));

    private static decimal NumberOf(string column) =>
        decimal.TryParse(
            new string([.. column.Where(character => char.IsDigit(character) || character is '.' or ',')]).Replace(',', '.'),
            NumberStyles.AllowDecimalPoint,
            CultureInfo.InvariantCulture,
            out var number)
            ? number
            : 0;

    private static string? ColumnsOf(string columns) =>
        Percent().Replace(columns, string.Empty).Trim() is { Length: > 0 } quantity
            ? TextLimit.Cut(quantity, ReceiptResult.QuantityMaxLength)
            : null;

    private static string? InvoiceNumberOf(List<string> head)
    {
        foreach (var line in head)
        {
            var folded = ReceiptItemKey.Fold(line);
            var names = folded.Contains("saskait", StringComparison.Ordinal)
                || folded.Contains("faktur", StringComparison.Ordinal)
                || folded.Contains("invoice", StringComparison.Ordinal)
                || folded.StartsWith("serija", StringComparison.Ordinal);
            if (!names || BankLine().IsMatch(folded))
            {
                continue;
            }

            var match = InvoiceNumber().Match(line);
            var number = match.Groups["number"].Value.TrimEnd('.', '-', '/');
            if (match.Success && number.Any(char.IsDigit) && !Iban().IsMatch(number))
            {
                var series = match.Groups["series"].Success ? match.Groups["series"].Value + " " : string.Empty;
                return TextLimit.Cut(series + number, ReceiptResult.InvoiceNumberMaxLength);
            }
        }

        return null;
    }

    private static DateAt? DueDateOf(List<string> lines, List<DateAt> dates)
    {
        for (var index = 0; index < lines.Count; index++)
        {
            if (DueLabel().Match(lines[index]) is { Success: true } label)
            {
                return DateAfter(dates, index, label.Index);
            }
        }

        return null;
    }

    private static DateOnly? IssueDateOf(List<string> lines, List<DateAt> dates, DateAt? due)
    {
        for (var index = 0; index < lines.Count; index++)
        {
            if (IssueLabel().Match(lines[index]) is { Success: true } label
                && DateAfter(dates, index, label.Index) is { } issued
                && issued != due)
            {
                return issued.Date;
            }
        }

        return dates.Find(date => date != due)?.Date;
    }

    private static DateAt? DateAfter(List<DateAt> dates, int line, int index) =>
        dates.Find(date => (date.Line == line && date.Index > index) || date.Line == line + 1);

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

        var read = DigitLike().Replace(digits, found => found.Value is "O" or "o" ? "0" : "1");
        var amount = decimal.Parse(
            $"{new string([.. read[..^3].Where(char.IsDigit)])}.{read[^2..]}",
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
        MerchantIndex(head) is >= 0 and var index
            ? TextLimit.Cut(Clean(CompanyCode().Replace(head[index], string.Empty)), ReceiptResult.TextMaxLength)
            : null;

    private static string? AddressOf(List<string> head) =>
        head.Skip(MerchantIndex(head) + 1).FirstOrDefault(IsAddress) is { } address
            ? TextLimit.Cut(Clean(Till().Replace(address, string.Empty)), ReceiptResult.TextMaxLength)
            : null;

    private static bool IsAddress(string line) =>
        StreetNumber().IsMatch(line)
        && (PostCode().IsMatch(line) || NotLetter().Split(ReceiptItemKey.Fold(line)).Any(Cities.Contains));

    private static List<DateAt> DatesOf(List<string> lines)
    {
        var dates = new List<DateAt>();
        for (var index = 0; index < lines.Count; index++)
        {
            foreach (Match match in DateLike().Matches(ZeroLike().Replace(lines[index], "0")))
            {
                var (year, month, day) = match.Groups["year"].Success
                    ? (match.Groups["year"].Value, match.Groups["month"].Value, match.Groups["day"].Value)
                    : (match.Groups["year2"].Value, match.Groups["month2"].Value, match.Groups["day2"].Value);
                if (DateFrom(year, int.Parse(month, CultureInfo.InvariantCulture), day) is { } date)
                {
                    dates.Add(new DateAt(index, match.Index, date));
                }
            }

            foreach (Match match in LongDate().Matches(lines[index]))
            {
                var month = Array.IndexOf(Months, ReceiptItemKey.Fold(match.Groups["month"].Value)) + 1;
                if (month > 0 && DateFrom(match.Groups["year"].Value, month, match.Groups["day"].Value) is { } date)
                {
                    dates.Add(new DateAt(index, match.Index, date));
                }
            }
        }

        return [.. dates.OrderBy(date => date.Line).ThenBy(date => date.Index)];
    }

    private static DateOnly? DateFrom(string yearText, int month, string dayText)
    {
        var year = int.Parse(yearText, CultureInfo.InvariantCulture);
        var day = int.Parse(dayText, CultureInfo.InvariantCulture);
        return month is >= 1 and <= 12 && day >= 1 && day <= DateTime.DaysInMonth(year, month) ? new DateOnly(year, month, day) : null;
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

    [GeneratedRegex(@"^[^\p{L}\p{N}""(]+|[^\p{L}\p{N}""“”)%]+$")]
    private static partial Regex JunkEdges();

    [GeneratedRegex(@"^(?<label>.*?)(?:^|(?<=[\s""“”„'‘’~|]))(?<minus>[-–—])?\s*(?<amount>\d{1,3}(?:[  .,]\d{3})+[.,]\d{2}|[0-9OoIl]{1,6}[.,][0-9OoIl]{2})(?:\s*(?:€|EUR|Eur))?(?:\s*[A-E])?$")]
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

    [GeneratedRegex(@"(?<!\d)(?<year>20\d\d)\s*m\.?\s*(?<month>\p{L}+)\s*(?<day>\d{1,2})\s*d(?!\p{L})", RegexOptions.IgnoreCase)]
    private static partial Regex LongDate();

    [GeneratedRegex(@"(?:ap)?mok[ėe]ti\s+iki|(?:ap)?mok[ėe]jimo\s+(?:terminas|data)|due\s+(?:date|by)|payment\s+due|pay\s+by", RegexOptions.IgnoreCase)]
    private static partial Regex DueLabel();

    [GeneratedRegex(@"s[ąa]skaitos\s+(?:i[šs]ra[šs]ymo\s+)?data|i[šs]ra[šs]ymo\s+data|invoice\s+date|date\s+of\s+issue|issue\s+date", RegexOptions.IgnoreCase)]
    private static partial Regex IssueLabel();

    [GeneratedRegex(@"(?<!\p{L})(?:pardav[ėe]jas|tiek[ėe]jas|seller|supplier|vendor)(?!\p{L})\s*:?\s*(?<rest>.*)$", RegexOptions.IgnoreCase)]
    private static partial Regex SellerLabel();

    [GeneratedRegex(@"(?<!\p{L})(?:pirk[ėe]jas|klientas|buyer|customer|bill\s+to)(?!\p{L})", RegexOptions.IgnoreCase)]
    private static partial Regex BuyerLabel();

    [GeneratedRegex(@"(?<!\p{L})(?:UAB|AB|MB|VšĮ|VŠĮ|IĮ|Ltd|LTD|GmbH|OÜ|SIA|AS|Inc|LLC)(?!\p{L})")]
    private static partial Regex CompanyForm();

    [GeneratedRegex(@"(?:serija\s*:?\s*(?<series>[\p{L}\p{N}-]{1,10})\s+)?(?<!\p{L})(?:nr|no|number|numeris|#)(?!\p{L})\.?\s*:?\s*(?<number>[\p{L}\p{N}][\p{L}\p{N}/._-]*)", RegexOptions.IgnoreCase)]
    private static partial Regex InvoiceNumber();

    [GeneratedRegex("iban|atsiskaitom|bank")]
    private static partial Regex BankLine();

    [GeneratedRegex(@"^[A-Z]{2}\d{2}")]
    private static partial Regex Iban();

    [GeneratedRegex(@"^\d{1,3}[.)]?\s+(?=\p{L})")]
    private static partial Regex RowNumber();

    [GeneratedRegex(@"^(?<name>.*?\p{L}.*?)(?<columns>(?:\s+" + Column + ")+)$", RegexOptions.IgnoreCase)]
    private static partial Regex InvoiceRow();

    [GeneratedRegex("^" + Column + @"(?:\s+" + Column + ")*$", RegexOptions.IgnoreCase)]
    private static partial Regex ColumnsOnly();

    [GeneratedRegex(@"\s*\d+(?:[.,]\d+)?\s?%")]
    private static partial Regex Percent();

    [GeneratedRegex(Column, RegexOptions.IgnoreCase)]
    private static partial Regex ColumnToken();

    [GeneratedRegex(@"^\d{5,13}\s+(?=\p{L})")]
    private static partial Regex ArticleCode();

    [GeneratedRegex(@"^[A-E]\s*=\s*\d")]
    private static partial Regex VatRow();

    [GeneratedRegex(@"\s+(?:[ĮI]\.\s?k\.|[ĮI]m\.\s?k\.|[ĮI]mon[ėe]s\s+kodas).*$", RegexOptions.IgnoreCase)]
    private static partial Regex CompanyCode();

    [GeneratedRegex(@"[,.]?\s*(?<!\p{L})Kasa(?!\p{L}).*$", RegexOptions.IgnoreCase)]
    private static partial Regex Till();

    [GeneratedRegex(@"(?<=\d[.,]\d{2}(?:\s?(?:€|EUR))?)\s+(?=\p{L}[\p{L} ]{0,30}:\s*-?\d)")]
    private static partial Regex LabelledAmounts();

    private sealed record Priced(string Label, decimal Amount, bool Negative);

    private sealed record DateAt(int Line, int Index, DateOnly Date);

    private sealed class Reading(bool isReturn, bool isInvoice)
    {
        private readonly List<Priced> vat = [];
        private string? pending;
        private bool afterItem;
        private bool parkedAfterItem;
        private bool discountColumn;

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
            if (isInvoice && priced is not null && StartsWithWord(key, VatWords) && !ContainsAny(key, NotVatWords))
            {
                vat.Add(priced);
                return false;
            }

            if (priced is null && IsTableHeader(line))
            {
                discountColumn = ContainsAny(key, DiscountWords);
                return false;
            }

            if (StartsWithWord(key, TotalWords) && !StartsWithAny(key, SkipWords))
            {
                Total = priced?.Amount;
                return priced is not null;
            }

            if (StartsWithAny(key, SkipWords) || VatRow().IsMatch(line) || Letters(line) + line.Count(char.IsDigit) == 0)
            {
                return false;
            }

            if (priced is null)
            {
                Park(line);
                return false;
            }

            if (pending is { } name && (priced.Label.Length == 0 || Continues(name, priced.Label)))
            {
                pending = null;
                afterItem = parkedAfterItem;
                return Take($"{name} {line}");
            }

            if (pending is not null && IsRow(priced.Label))
            {
                TakeRow(priced);
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

            var tax = vat.Sum(line => line.Amount);
            if (vat.Count > 0 && Total is { } total && Math.Abs(Balance() + tax - total) <= 0.01m)
            {
                vat.ForEach(line => Adjust(ReceiptAdjustmentKind.Vat, line.Label, line.Amount));
            }
        }

        private decimal Balance() =>
            Items.Sum(item => item.Amount - item.Discount + item.Deposit) + Adjustments.Sum(adjustment => adjustment.Amount);

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

        private void TakeRow(Priced priced)
        {
            var columns = ColumnToken().Matches(priced.Label).Select(match => match.Value.Trim()).ToList();
            var discount = discountColumn ? NumberOf(columns[^1]) : 0;
            TakeQuantity(ColumnsOf(string.Join(' ', discountColumn ? columns[..^1] : columns)), priced.Amount);
            if (discount > 0 && afterItem)
            {
                Items[^1] = Items[^1] with { Discount = discount };
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
            if (isInvoice)
            {
                name = RowNumber().Replace(name, string.Empty);
                if (quantity is null && InvoiceRow().Match(name) is { Success: true } row && row.Groups["columns"].Value.Any(char.IsDigit))
                {
                    name = row.Groups["name"].Value;
                    quantity = ColumnsOf(row.Groups["columns"].Value);
                }
            }

            name = ArticleCode().Replace(name, string.Empty);

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

            parkedAfterItem = afterItem;
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
