using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;

namespace JxFinance.Endpoints.Imports.Shared;

public sealed record CsvMappingResponse(
    Guid Id,
    string Name,
    CsvEncoding Encoding,
    string Delimiter,
    int SkipLines,
    bool NoHeaderRow,
    CsvAmountStyle AmountStyle,
    string DateFormat,
    CsvDecimalSeparator DecimalSeparator,
    Currency? Currency,
    CsvColumnMap Columns);
