using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
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
        var configuration = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            DetectDelimiter = true,
            PrepareHeaderForMatch = args => args.Header.Trim().ToLowerInvariant(),
            MissingFieldFound = null,
            BadDataFound = null,
        };
        using var csv = new CsvReader(reader, configuration);
        if (!csv.Read() || !csv.ReadHeader() || csv.HeaderRecord is not { Length: > 0 } headers)
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
        csv.TryGetField<string>(name, out var value) && value?.Trim() is { Length: > 0 } text ? text : null;
}

public sealed record PricePoint(DateOnly Date, decimal Price);

public sealed record PriceFile(IReadOnlyList<PricePoint> Points, int Unreadable);
