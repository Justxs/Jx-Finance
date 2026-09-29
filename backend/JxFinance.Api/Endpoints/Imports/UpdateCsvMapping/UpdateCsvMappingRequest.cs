using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Imports.Shared;

namespace JxFinance.Endpoints.Imports.UpdateCsvMapping;

public sealed record UpdateCsvMappingRequest(
    Guid Id,
    string Name,
    CsvEncoding Encoding,
    string Delimiter,
    int SkipLines,
    CsvAmountStyle AmountStyle,
    string DateFormat,
    CsvDecimalSeparator DecimalSeparator,
    CsvColumnMap Columns,
    Currency? Currency = null) : ICsvMappingInput;
