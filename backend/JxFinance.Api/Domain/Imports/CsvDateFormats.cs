namespace JxFinance.Domain.Imports;

public static class CsvDateFormats
{
    public const int MaxLength = 12;

    public static IReadOnlyList<string> All { get; } =
    [
        "yyyy-MM-dd",
        "dd.MM.yyyy",
        "dd/MM/yyyy",
        "MM/dd/yyyy",
        "dd-MM-yyyy",
        "yyyy.MM.dd",
        "yyyy/MM/dd",
        "d.M.yyyy",
    ];
}
