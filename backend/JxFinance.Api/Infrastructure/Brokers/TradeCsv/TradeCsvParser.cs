using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Brokers.InteractiveBrokers;

namespace JxFinance.Infrastructure.Brokers.TradeCsv;

public static class TradeCsvParser
{
    public const int MaxRows = 10000;

    private static readonly string[] Required = ["date", "type", "currency"];

    private static readonly Dictionary<string, (string Marker, int Sign)> CashTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["dividend"] = ("Dividends", 1),
        ["withholdingtax"] = ("Withholding Tax", -1),
        ["tax"] = ("Withholding Tax", -1),
        ["interest"] = ("Broker Interest Received", 1),
        ["fee"] = ("Other Fees", -1),
    };

    public static Result<FlexStatement> Parse(Stream stream)
    {
        using var reader = new StreamReader(stream, new UTF8Encoding(false), detectEncodingFromByteOrderMarks: true);
        var configuration = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            DetectDelimiter = true,
            PrepareHeaderForMatch = args => args.Header.Trim().Replace(" ", "", StringComparison.Ordinal).ToLowerInvariant(),
            MissingFieldFound = null,
            BadDataFound = null,
        };
        using var csv = new CsvReader(reader, configuration);
        if (!csv.Read() || !csv.ReadHeader() || csv.HeaderRecord is not { } headers
            || !Required.All(name => headers.Any(header => Key(header) == name)))
        {
            return Invalid();
        }

        var trades = new List<FlexTrade>();
        var cash = new List<FlexCashTransaction>();
        var unreadable = 0;
        var seen = new Dictionary<string, int>(StringComparer.Ordinal);
        while (csv.Read())
        {
            if (trades.Count + cash.Count + unreadable >= MaxRows)
            {
                return Invalid();
            }

            var row = Row(csv);
            if (row is null)
            {
                unreadable++;
                continue;
            }

            var id = row.Id ?? Hash(csv.Parser.RawRecord.Trim());
            var occurrence = seen.GetValueOrDefault(id);
            seen[id] = occurrence + 1;
            if (occurrence > 0)
            {
                id = Hash($"{id}#{occurrence}");
            }

            if (row.Type is "buy" or "sell")
            {
                if (Trade(id, row) is { } trade)
                {
                    trades.Add(trade);
                }
                else
                {
                    unreadable++;
                }
            }
            else if (CashTypes.TryGetValue(row.Type, out var kind) && row.Amount is { } amount && amount != 0m)
            {
                var instrument = row.Symbol is { } symbol ? Instrument(symbol, row) : null;
                cash.Add(new FlexCashTransaction(id, kind.Marker, instrument, row.Date, kind.Sign * Math.Abs(amount), row.Currency, row.Description));
            }
            else
            {
                unreadable++;
            }
        }

        return new FlexStatement([], trades, cash, [], [], unreadable);
    }

    private static FlexTrade? Trade(string id, CsvRow row)
    {
        if (row is not { Symbol: { } symbol, Quantity: { } quantity, Price: { } price } || quantity <= 0m || price < 0m)
        {
            return null;
        }

        var buy = row.Type == "buy";
        var value = quantity * price;
        return new FlexTrade(
            id,
            Instrument(symbol, row),
            row.Date,
            buy ? quantity : -quantity,
            price,
            buy ? -value : value,
            0m,
            -Math.Abs(row.Fee ?? 0m),
            row.Currency);
    }

    private static FlexInstrument Instrument(string symbol, CsvRow row) => new(
        null,
        symbol,
        row.Name ?? symbol,
        row.Isin,
        null,
        row.SecurityType == "fund" ? "FUND" : "STK",
        row.SecurityType == "etf" ? "ETF" : null,
        row.Currency);

    private static CsvRow? Row(CsvReader csv)
    {
        var date = Text(csv, "date");
        var type = Text(csv, "type")?.Replace(" ", "", StringComparison.Ordinal).ToLowerInvariant();
        if (type is null
            || !DateOnly.TryParseExact(date, ["yyyy-MM-dd", "yyyy.MM.dd", "dd.MM.yyyy"], CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate)
            || !CurrencyCode.TryParse(Text(csv, "currency"), out var currency))
        {
            return null;
        }

        return new CsvRow(
            Text(csv, "id") is { Length: > 0 and <= 40 } id ? id : null,
            parsedDate,
            type,
            Text(csv, "symbol")?.ToUpperInvariant(),
            Text(csv, "name"),
            Text(csv, "isin")?.ToUpperInvariant(),
            Text(csv, "securitytype")?.ToLowerInvariant(),
            Number(Text(csv, "quantity")),
            Number(Text(csv, "price")),
            Number(Text(csv, "amount")),
            Number(Text(csv, "fee")),
            currency,
            Text(csv, "description"));
    }

    private static string? Text(CsvReader csv, string name) =>
        csv.TryGetField<string>(name, out var value) && value?.Trim() is { Length: > 0 } text ? text : null;

    private static decimal? Number(string? text)
    {
        if (text is null)
        {
            return null;
        }

        var decimalComma = text.LastIndexOf(',') > text.LastIndexOf('.');
        var normalized = decimalComma
            ? text.Replace(".", "", StringComparison.Ordinal).Replace(',', '.')
            : text.Replace(",", "", StringComparison.Ordinal);
        return decimal.TryParse(normalized, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var value)
            ? value
            : null;
    }

    private static string Key(string header) => header.Trim().Replace(" ", "", StringComparison.Ordinal).ToLowerInvariant();

    private static string Hash(string text) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text)))[..32].ToLowerInvariant();

    private static DomainError Invalid() => new(
        ErrorCodes.ImportInvalidFile,
        "The file is not a trade CSV with Date, Type and Currency columns.");

    private sealed record CsvRow(
        string? Id,
        DateOnly Date,
        string Type,
        string? Symbol,
        string? Name,
        string? Isin,
        string? SecurityType,
        decimal? Quantity,
        decimal? Price,
        decimal? Amount,
        decimal? Fee,
        Currency Currency,
        string? Description);
}
