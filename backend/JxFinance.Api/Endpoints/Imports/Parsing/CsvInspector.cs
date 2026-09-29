using System.Text.Unicode;
using CsvHelper;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Imports.InspectCsv;
using JxFinance.Endpoints.Imports.Shared;

namespace JxFinance.Endpoints.Imports.Parsing;

public static class CsvInspector
{
    private const int SampleRows = 10;
    private const int DetectionRecords = 50;

    public static async Task<Result<InspectCsvResponse>> InspectAsync(
        Stream stream,
        CsvEncoding? encoding,
        string? delimiter,
        int? skipLines,
        CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer, cancellationToken);
        var bytes = buffer.ToArray();
        var chosenEncoding = encoding ?? (IsUtf8(bytes) ? CsvEncoding.Utf8 : CsvEncoding.Windows1257);
        string text;
        using (var reader = CsvText.Open(new MemoryStream(bytes), chosenEncoding))
        {
            text = await reader.ReadToEndAsync(cancellationToken);
        }

        try
        {
            var chosenDelimiter = delimiter ?? CsvMappingRules.Delimiters.MaxBy(candidate => Fit(text, candidate))!;
            var records = CsvText.Records(new StringReader(text), chosenDelimiter).ToList();
            var headerAt = skipLines ?? HeaderLine(records);
            if (headerAt + 1 >= records.Count || records[headerAt].Length < 2)
            {
                return Invalid();
            }

            var samples = records.Skip(headerAt + 1).Take(SampleRows).ToList();
            var columns = records[headerAt]
                .Select((name, index) => Column(name.Trim(), samples.Select(row => index < row.Length ? row[index].Trim() : "")))
                .ToList();
            return new InspectCsvResponse(chosenEncoding, chosenDelimiter, headerAt, columns, samples, []);
        }
        catch (CsvHelperException)
        {
            return Invalid();
        }
    }

    private static bool IsUtf8(byte[] bytes)
    {
        return bytes is [0xEF, 0xBB, 0xBF, ..] or [0xFF, 0xFE, ..] or [0xFE, 0xFF, ..] || Utf8.IsValid(bytes);
    }

    private static (int Rows, int Cells) Fit(string text, string delimiter)
    {
        var counts = CsvText.Records(new StringReader(text), delimiter)
            .Take(DetectionRecords)
            .Select(record => record.Length)
            .Where(count => count > 1)
            .CountBy(count => count)
            .ToList();
        return counts.Count == 0
            ? (0, 0)
            : counts.Select(entry => (entry.Value, entry.Key)).Max();
    }

    private static int HeaderLine(List<string[]> records)
    {
        var width = records
            .Take(DetectionRecords)
            .CountBy(record => record.Length)
            .Where(entry => entry.Key > 1)
            .OrderByDescending(entry => entry.Value)
            .ThenByDescending(entry => entry.Key)
            .Select(entry => entry.Key)
            .FirstOrDefault();
        var index = records.FindIndex(record => record.Length == width);
        return index is >= 0 and <= CsvImportMapping.MaxSkipLines ? index : 0;
    }

    private static InspectCsvColumn Column(string name, IEnumerable<string> cells)
    {
        var values = cells.Where(cell => cell.Length > 0).ToList();
        if (values.Count == 0)
        {
            return new InspectCsvColumn(name, [], null);
        }

        var dates = values.Where(value => CsvDateFormats.All.Any(format => CsvText.Date(value, format) is not null)).ToList();
        var dateFormats = dates.Count * 2 > values.Count
            ? CsvDateFormats.All.Where(format => dates.All(value => CsvText.Date(value, format) is not null)).ToList()
            : [];
        var separator = values.Any(CsvText.EndsWithDecimalComma) ? CsvDecimalSeparator.Comma : CsvDecimalSeparator.Dot;
        var numeric = dateFormats.Count == 0
            && values.All(value => CsvText.LooksLikeNumber(value) && CsvText.TryNumber(value, separator, out _));
        return new InspectCsvColumn(name, dateFormats, numeric ? separator : null);
    }

    private static DomainError Invalid() => new(
        ErrorCodes.ImportInvalidFile,
        "The file is not a CSV file with a header row and at least one entry.");
}
