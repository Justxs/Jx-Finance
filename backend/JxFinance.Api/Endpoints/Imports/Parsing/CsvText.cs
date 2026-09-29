using System.Buffers;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using CsvHelper;
using CsvHelper.Configuration;
using JxFinance.Common.Validation;
using JxFinance.Domain.Imports;

namespace JxFinance.Endpoints.Imports.Parsing;

public static partial class CsvText
{
    private static readonly SearchValues<char> Digits = SearchValues.Create("0123456789");

    private static readonly SearchValues<char> Minus = SearchValues.Create("-−(");

    public static TextReader Open(Stream stream, CsvEncoding encoding) =>
        new StreamReader(stream, EncodingOf(encoding), detectEncodingFromByteOrderMarks: true);

    public static IEnumerable<string[]> Records(TextReader reader, string delimiter)
    {
        using var parser = new CsvParser(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            Delimiter = delimiter,
            HasHeaderRecord = false,
            BadDataFound = null,
            MissingFieldFound = null,
            DetectColumnCountChanges = false,
        });
        while (parser.Read())
        {
            if (parser.Record is { } record && record.Any(cell => cell.Trim().Length > 0))
            {
                yield return record;
            }
        }
    }

    public static DateOnly? Date(string text, string format)
    {
        var end = text.IndexOfAny([' ', 'T']);
        return DateOnly.TryParseExact(end < 0 ? text : text[..end], format, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
            ? date
            : null;
    }

    public static bool TryNumber(string text, CsvDecimalSeparator separator, out decimal? value)
    {
        value = null;
        var first = text.AsSpan().IndexOfAny(Digits);
        if (first < 0)
        {
            return true;
        }

        var last = text.AsSpan().LastIndexOfAny(Digits);
        var negative = text.AsSpan(0, first).ContainsAny(Minus) || text[(last + 1)..].Contains('-');
        var mark = separator == CsvDecimalSeparator.Comma ? ',' : '.';
        var plain = new string(text.Where(c => char.IsAsciiDigit(c) || c == mark).ToArray()).Replace(mark, '.');
        if (DecimalRules.ParseMoneyText(plain) is not { } parsed)
        {
            return false;
        }

        value = negative ? -parsed : parsed;
        return true;
    }

    public static bool LooksLikeNumber(string text) => NumberPattern().IsMatch(text);

    public static bool EndsWithDecimalComma(string text) => DecimalCommaPattern().IsMatch(text);

    private static Encoding EncodingOf(CsvEncoding encoding) => encoding switch
    {
        CsvEncoding.Windows1257 => CodePagesEncodingProvider.Instance.GetEncoding(1257)!,
        CsvEncoding.Windows1252 => CodePagesEncodingProvider.Instance.GetEncoding(1252)!,
        _ => new UTF8Encoding(false),
    };

    [GeneratedRegex(@"^[-\u2212+(]?\s*(\p{Sc}|[A-Za-z]{3})?\s*[-\u2212]?[\d.,'\u2019\s\u00a0\u202f]*\d\s*(\p{Sc}|[A-Za-z]{3})?\s*\)?-?$")]
    private static partial Regex NumberPattern();

    [GeneratedRegex(@",\d{2}\D*$")]
    private static partial Regex DecimalCommaPattern();
}
