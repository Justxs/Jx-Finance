using System.Globalization;
using System.Text;
using CsvHelper;
using JxFinance.Common.Errors;
using JxFinance.Common.Formats;
using JxFinance.Domain.Common;

namespace JxFinance.Infrastructure.MarketPrices;

public static class PriceCsvParser
{
    private const string DateColumn = "date";
    private const string PriceColumn = "price";

    private static readonly string[] AcceptedDates = ["yyyy-MM-dd", "yyyy.MM.dd", "dd.MM.yyyy"];

    public static Result<PriceFile> Parse(Stream stream)
    {
        using var reader = new StreamReader(stream, new UTF8Encoding(false), detectEncodingFromByteOrderMarks: true);
        using var csv = CsvReader.Create(reader, CsvReaderOptions.Default);
        if (csv.Headers is not { Count: > 0 } headers)
        {
            return new DomainError(ErrorCodes.ImportInvalidFile, "The file is not a CSV with a header row.");
        }

        var names = headers.Select(h => h.Trim().ToLowerInvariant()).ToHashSet(StringComparer.Ordinal);
        if (!names.Contains(DateColumn) || !names.Contains(PriceColumn))
        {
            return new DomainError(ErrorCodes.ImportMissingColumns, "The file needs a date and a price column.");
        }

        var points = new SortedDictionary<DateOnly, decimal>();
        var unreadable = 0;
        while (csv.Read())
        {
            if (Text(csv, DateColumn) is { } text
                && DateOnly.TryParseExact(text, AcceptedDates, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
                && CsvNumber.Parse(Text(csv, PriceColumn)) is { } price
                && price > 0m
                && decimal.Round(price, 8) == price)
            {
                points[date] = price;
            }
            else
            {
                unreadable++;
            }
        }

        return new PriceFile([.. points.Select(p => new PricePoint(p.Key, p.Value))], unreadable);
    }

    private static string? Text(CsvReader csv, string name) =>
        csv.TryGetFieldIndex(name, out var index) && csv.GetString(index).Trim() is { Length: > 0 } text ? text : null;
}

public sealed record PricePoint(DateOnly Date, decimal Price);

public sealed record PriceFile(IReadOnlyList<PricePoint> Points, int Unreadable);
