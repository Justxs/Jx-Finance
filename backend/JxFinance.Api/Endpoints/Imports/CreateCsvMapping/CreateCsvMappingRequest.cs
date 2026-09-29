using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Imports.Shared;

namespace JxFinance.Endpoints.Imports.CreateCsvMapping;

public sealed record CreateCsvMappingRequest(
    string Name,
    CsvEncoding Encoding,
    string Delimiter,
    int SkipLines,
    CsvAmountStyle AmountStyle,
    string DateFormat,
    CsvDecimalSeparator DecimalSeparator,
    CsvColumnMap Columns,
    Currency? Currency = null) : ICsvMappingInput;
