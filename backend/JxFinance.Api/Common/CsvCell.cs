namespace JxFinance.Common;

public static class CsvCell
{
    private const string FormulaTriggers = "=+-@\t\r";

    public static string Row(params string[] cells) => string.Join(',', cells);

    public static string Text(string? value) => Escape(Neutralize(value ?? string.Empty));

    public static string Value(string? value) => Escape(value ?? string.Empty);

    private static string Neutralize(string value) =>
        value.Length > 0 && FormulaTriggers.Contains(value[0]) ? $"'{value}" : value;

    private static string Escape(string value) =>
        value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r')
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
}
