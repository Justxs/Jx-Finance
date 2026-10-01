using System.Globalization;

namespace JxFinance.Domain.Imports;

public sealed record CsvColumnMap
{
    public required string Date { get; init; }

    public string? Description { get; init; }

    public string? Payee { get; init; }

    public string? Amount { get; init; }

    public string? Debit { get; init; }

    public string? Credit { get; init; }

    public string? Direction { get; init; }

    public string? ExpenseValue { get; init; }

    public string? Currency { get; init; }

    public string? Reference { get; init; }

    public string? Balance { get; init; }

    public string? Fee { get; init; }

    public string? Status { get; init; }

    public string? BookedValues { get; init; }

    public IEnumerable<string> Named() =>
        new[] { Date, Description, Payee, Amount, Debit, Credit, Direction, Currency, Reference, Balance, Fee, Status }
            .OfType<string>()
            .Where(name => name.Length > 0)
            .Distinct(StringComparer.Ordinal);

    public bool Completes(CsvAmountStyle style) => style switch
    {
        CsvAmountStyle.DebitCredit => Filled(Debit) && Filled(Credit),
        CsvAmountStyle.AmountWithDirection => Filled(Amount) && Filled(Direction) && Filled(ExpenseValue),
        _ => Filled(Amount),
    } && (Status is null || Filled(BookedValues));

    public static string Position(int index) => (index + 1).ToString(CultureInfo.InvariantCulture);

    public static bool IsPosition(string name) =>
        int.TryParse(name, NumberStyles.None, CultureInfo.InvariantCulture, out var position)
        && position is >= 1 and <= CsvImportMapping.MaxColumnPosition;

    private static bool Filled(string? value) => !string.IsNullOrWhiteSpace(value);
}
