using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;

namespace JxFinance.Endpoints.Imports.Parsing;

public static class StatementReader
{
    private const long Megabyte = 1024 * 1024;

    public static long MaxBytes(StatementFormat format) => (format == StatementFormat.Camt053 ? 20 : 5) * Megabyte;

    public static async Task<Result<ParsedStatement>> ReadAsync(
        StatementFormat format,
        Stream stream,
        string? accountIban,
        Currency accountCurrency,
        CsvImportMapping? mapping,
        TimeZoneInfo timeZone,
        CancellationToken cancellationToken) =>
        format switch
        {
            StatementFormat.Camt053 => await Camt053Parser.ParseAsync(stream, accountIban, timeZone, cancellationToken),
            StatementFormat.Ofx => OfxParser.Parse(stream, accountCurrency),
            StatementFormat.Mt940 => Mt940Parser.Parse(stream, accountCurrency),
            StatementFormat.GenericCsv => mapping is null
                ? new DomainError(ErrorCodes.ReferenceNotFound, "CSV mapping does not exist.")
                : GenericCsvParser.Parse(stream, mapping, accountCurrency),
            _ => SwedbankCsvParser.Parse(stream),
        };
}
