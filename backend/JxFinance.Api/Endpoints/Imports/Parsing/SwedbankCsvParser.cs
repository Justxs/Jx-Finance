using System.Globalization;
using CsvHelper;
using JxFinance.Common.Errors;
using JxFinance.Common.Formats;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Imports.Parsing;

public static class SwedbankCsvParser
{
    private const string TransactionRowType = "20";

    public static Result<ParsedStatement> Parse(Stream fileStream)
    {
        try
        {
            return new ParsedStatement(ParseRows(fileStream));
        }
        catch (Exception ex) when (ex is CsvFormatException or FormatException or IndexOutOfRangeException or OverflowException)
        {
            return new DomainError(
                ErrorCodes.ImportInvalidFile,
                "The file doesn't match the expected Swedbank CSV export shape.");
        }
    }

    private static List<ParsedRow> ParseRows(Stream fileStream)
    {
        using var csv = CsvReader.Create(new StreamReader(fileStream), new CsvReaderOptions
        {
            Separator = ',',
            MalformedData = CsvMalformedDataHandling.Throw,
            MissingField = CsvMissingFieldHandling.Throw,
        });

        csv.ReadHeader();
        string[] expected = ["Sąskaitos Nr.", "", "Data", "Gavėjas", "Paaiškinimai", "Suma", "Valiuta", "D/K", "Įrašo Nr."];
        if (csv.Headers is not { Count: >= 9 } headers ||
            !expected.Select((name, index) => headers[index].Trim() == name).All(matches => matches))
            throw new FormatException("Unexpected CSV columns.");

        var rows = new List<ParsedRow>();
        while (csv.Read())
        {
            var rowType = csv.GetString(1);
            if (rowType != TransactionRowType)
            {
                continue;
            }

            var date = DateOnly.ParseExact(csv.GetString(2).Trim(), DateFormats.IsoDate, CultureInfo.InvariantCulture);
            var payee = csv.GetString(3).Trim();
            var description = csv.GetString(4).Trim();
            var amount = decimal.Parse(csv.GetString(5).Trim(), NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture);
            var direction = csv.GetString(7).Trim();
            var importRef = csv.GetString(8).Trim();

            if (direction is not ("D" or "K") || !CurrencyCode.TryParse(csv.GetString(6), out var currency)
                || string.IsNullOrWhiteSpace(importRef) || importRef.Length > ImportReferences.MaxLength
                || amount <= 0 || !DecimalRules.FitsMoney(amount) || description.Length > ParsedStatement.DescriptionMaxLength)
                throw new FormatException("Invalid bank entry.");
            if (rows.Count >= ParsedStatement.MaxRows) throw new FormatException($"At most {ParsedStatement.MaxRows} entries can be imported at once.");

            rows.Add(new ParsedRow(
                importRef,
                date,
                payee,
                description,
                amount,
                direction == "K" ? FlowType.Income : FlowType.Expense,
                currency));
        }

        return rows;
    }
}
