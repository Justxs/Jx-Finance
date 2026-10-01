using JxFinance.Domain.Common;

namespace JxFinance.Domain.Imports;

public sealed class CsvImportMapping : OwnableEntity
{
    public const int NameMaxLength = 60;
    public const int ColumnNameMaxLength = 200;
    public const int MaxSkipLines = 20;
    public const int MaxColumnPosition = 100;

    public CsvImportMappingId Id { get; set; } = CsvImportMappingId.New();
    public required string Name { get; set; }
    public CsvEncoding Encoding { get; set; }
    public required string Delimiter { get; set; }
    public int SkipLines { get; set; }
    public bool NoHeaderRow { get; set; }
    public CsvAmountStyle AmountStyle { get; set; }
    public required string DateFormat { get; set; }
    public CsvDecimalSeparator DecimalSeparator { get; set; }
    public Currency? Currency { get; set; }
    public required CsvColumnMap Columns { get; set; }
}
