using System.Globalization;
using CsvHelper;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;

namespace JxFinance.Endpoints.Imports.Parsing;

public static class GenericCsvParser
{
    public static Result<ParsedStatement> Parse(Stream stream, CsvImportMapping mapping, Currency accountCurrency)
    {
        try
        {
            using var reader = CsvText.Open(stream, mapping.Encoding);
            using var records = CsvText.Records(reader, mapping.Delimiter).Skip(mapping.SkipLines).GetEnumerator();
            if (!records.MoveNext())
            {
                return Invalid();
            }

            var first = records.Current;
            var header = first
                .Select((name, index) => (Name: mapping.NoHeaderRow ? CsvColumnMap.Position(index) : name.Trim(), Index: index))
                .DistinctBy(column => column.Name, StringComparer.Ordinal)
                .ToDictionary(column => column.Name, column => column.Index, StringComparer.Ordinal);
            var missing = mapping.Columns.Named().Where(name => !header.ContainsKey(name)).ToList();
            if (missing.Count > 0)
            {
                return new DomainError(
                    ErrorCodes.ImportMissingColumns,
                    string.Join(", ", missing.Select(name => $"\"{name}\"")));
            }

            var entries = Rest(records);
            return Read(mapping.NoHeaderRow ? entries.Prepend(first) : entries, new Reader(mapping, header, accountCurrency));
        }
        catch (CsvHelperException)
        {
            return Invalid();
        }
    }

    private static IEnumerable<string[]> Rest(IEnumerator<string[]> records)
    {
        while (records.MoveNext())
        {
            yield return records.Current;
        }
    }

    private static Result<ParsedStatement> Read(IEnumerable<string[]> records, Reader reader)
    {
        var rows = new List<(ParsedRow Row, decimal? Balance)>();
        var notBooked = 0;
        var unreadable = 0;
        foreach (var cells in records)
        {
            if (!reader.IsBooked(cells))
            {
                notBooked++;
                continue;
            }

            if (reader.Row(cells) is not { } entry)
            {
                unreadable++;
            }
            else if (entry.Row.Amount == 0)
            {
                notBooked++;
            }
            else
            {
                rows.Add(entry);
            }

            if (rows.Count > ParsedStatement.MaxRows)
            {
                return Invalid();
            }
        }

        if (rows.Count == 0 && notBooked == 0)
        {
            return Invalid();
        }

        var parsed = rows.Select(entry => entry.Row).ToList();
        ImportReferences.Disambiguate(parsed);
        var (closingDate, closingBalance) = reader.Closing(rows);
        return new ParsedStatement(parsed, null, closingDate, closingBalance, notBooked, unreadable);
    }

    private static DomainError Invalid() => new(
        ErrorCodes.ImportInvalidFile,
        "The file is not a CSV file this mapping can read: it needs its header row, unless the mapping reads columns by position, and at least one entry.");

    private sealed class Reader(CsvImportMapping mapping, Dictionary<string, int> header, Currency accountCurrency)
    {
        private readonly CsvColumnMap columns = mapping.Columns;

        private readonly HashSet<string> booked = (mapping.Columns.BookedValues ?? "")
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        public bool IsBooked(string[] cells) =>
            columns.Status is null || booked.Contains(Cell(cells, columns.Status));

        public (ParsedRow Row, decimal? Balance)? Row(string[] cells)
        {
            var rawDate = Cell(cells, columns.Date);
            var currency = columns.Currency is { } currencyColumn
                ? CurrencyCode.TryParse(Cell(cells, currencyColumn), out var parsed) ? parsed : (Currency?)null
                : mapping.Currency ?? accountCurrency;
            if (CsvText.Date(rawDate, mapping.DateFormat) is not { } date
                || Signed(cells) is not { } signed
                || currency is not { } rowCurrency
                || !DecimalRules.FitsMoney(signed)
                || !CsvText.TryNumber(Cell(cells, columns.Balance), mapping.DecimalSeparator, out var balance))
            {
                return null;
            }

            var payee = Text(Cell(cells, columns.Payee));
            var description = Text(Cell(cells, columns.Description)) ?? payee;
            description = description?[..Math.Min(description.Length, ParsedStatement.DescriptionMaxLength)];
            var reference = Cell(cells, columns.Reference);
            if (reference.Length is 0 or > ImportReferences.MaxLength)
            {
                reference = ImportReferences.Hash(
                    $"{rawDate}|{signed.ToString(CultureInfo.InvariantCulture)}|{rowCurrency}|{description}|{payee}|{Cell(cells, columns.Balance)}");
            }

            var row = new ParsedRow(
                reference,
                date,
                payee,
                description,
                Math.Abs(signed),
                signed < 0 ? FlowType.Expense : FlowType.Income,
                rowCurrency);
            return (row, balance);
        }

        public (DateOnly? Date, Money? Balance) Closing(List<(ParsedRow Row, decimal? Balance)> rows)
        {
            if (columns.Balance is null || rows.Count == 0)
            {
                return (null, null);
            }

            var latest = rows[0].Row.Date > rows[^1].Row.Date ? rows[0] : rows[^1];
            var balance = mapping.AmountStyle == CsvAmountStyle.SignedPositiveIsExpense ? -latest.Balance : latest.Balance;
            return (latest.Row.Date, balance is { } amount ? new Money(amount, latest.Row.Currency) : null);
        }

        private decimal? Signed(string[] cells)
        {
            var amount = Number(cells, columns.Amount);
            var fee = Number(cells, columns.Fee);
            if (amount is null || fee is null)
            {
                return null;
            }

            var money = mapping.AmountStyle switch
            {
                CsvAmountStyle.SignedNegativeIsExpense => amount.Value,
                CsvAmountStyle.SignedPositiveIsExpense => -amount.Value,
                CsvAmountStyle.AmountWithDirection => string.Equals(
                    Cell(cells, columns.Direction),
                    columns.ExpenseValue?.Trim(),
                    StringComparison.OrdinalIgnoreCase)
                    ? -Math.Abs(amount.Value)
                    : Math.Abs(amount.Value),
                _ => DebitOrCredit(Number(cells, columns.Debit), Number(cells, columns.Credit)),
            };
            return money - Math.Abs(fee.Value);
        }

        private static decimal? DebitOrCredit(decimal? debit, decimal? credit) => (debit, credit) switch
        {
            (null, _) or (_, null) => null,
            (not 0, not 0) => null,
            _ => credit.Value == 0 ? -Math.Abs(debit.Value) : Math.Abs(credit.Value),
        };

        private decimal? Number(string[] cells, string? column) =>
            CsvText.TryNumber(Cell(cells, column), mapping.DecimalSeparator, out var value) ? value ?? 0 : null;

        private string Cell(string[] cells, string? column) =>
            column is not null && header.TryGetValue(column, out var index) && index < cells.Length
                ? cells[index].Trim()
                : "";

        private static string? Text(string value) => value.Length > 0 ? value : null;
    }
}
