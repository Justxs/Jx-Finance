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
        catch (Exception ex) when (ex is CsvHelperException or FormatException or IndexOutOfRangeException or OverflowException)
        {
            return new DomainError(
                ErrorCodes.ImportInvalidFile,
                "The file doesn't match the expected Swedbank CSV export shape.");
        }
    }

    private static List<ParsedRow> ParseRows(Stream fileStream)
    {
        using var reader = new StreamReader(fileStream);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        csv.Read();
        csv.ReadHeader();
        string[] expected = ["Sąskaitos Nr.", "", "Data", "Gavėjas", "Paaiškinimai", "Suma", "Valiuta", "D/K", "Įrašo Nr."];
        if (csv.HeaderRecord is not { Length: >= 9 } headers ||
            !expected.Select((name, index) => headers[index].Trim() == name).All(matches => matches))
            throw new FormatException("Unexpected CSV columns.");

        var rows = new List<ParsedRow>();
        while (csv.Read())
        {
            var rowType = csv.GetField(1);
            if (rowType != TransactionRowType)
            {
                continue;
            }

            var date = DateOnly.ParseExact(csv.GetField(2)!.Trim(), DateFormats.IsoDate, CultureInfo.InvariantCulture);
            var payee = csv.GetField(3)?.Trim();
            var description = csv.GetField(4)?.Trim();
            var amount = decimal.Parse(csv.GetField(5)!.Trim(), NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture);
            var direction = csv.GetField(7)?.Trim();
            var importRef = csv.GetField(8)!.Trim();

            if (direction is not ("D" or "K") || !CurrencyCode.TryParse(csv.GetField(6), out var currency)
                || string.IsNullOrWhiteSpace(importRef) || importRef.Length > 64
                || amount <= 0 || !DecimalRules.FitsMoney(amount) || description?.Length > 500)
                throw new FormatException("Invalid bank entry.");
            if (rows.Count >= 10000) throw new FormatException("At most 10000 entries can be imported at once.");

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
