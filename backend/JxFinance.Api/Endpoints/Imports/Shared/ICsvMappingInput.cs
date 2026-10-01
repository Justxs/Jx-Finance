using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;

namespace JxFinance.Endpoints.Imports.Shared;

public interface ICsvMappingInput
{
    string Name { get; }
    CsvEncoding Encoding { get; }
    string Delimiter { get; }
    int SkipLines { get; }
    bool NoHeaderRow { get; }
    CsvAmountStyle AmountStyle { get; }
    string DateFormat { get; }
    CsvDecimalSeparator DecimalSeparator { get; }
    Currency? Currency { get; }
    CsvColumnMap Columns { get; }
}
