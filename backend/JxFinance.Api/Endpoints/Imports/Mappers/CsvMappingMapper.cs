using JxFinance.Common;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Imports.Shared;

namespace JxFinance.Endpoints.Imports.Mappers;

public static class CsvMappingMapper
{
    public static CsvImportMapping ToEntity(this ICsvMappingInput input)
    {
        var mapping = new CsvImportMapping { Name = input.Name, Delimiter = input.Delimiter, DateFormat = input.DateFormat, Columns = input.Columns };
        input.ApplyTo(mapping);
        return mapping;
    }

    public static void ApplyTo(this ICsvMappingInput input, CsvImportMapping mapping)
    {
        mapping.Name = OptionalText.Normalize(input.Name) ?? input.Name;
        mapping.Encoding = input.Encoding;
        mapping.Delimiter = input.Delimiter;
        mapping.SkipLines = input.SkipLines;
        mapping.NoHeaderRow = input.NoHeaderRow;
        mapping.AmountStyle = input.AmountStyle;
        mapping.DateFormat = input.DateFormat;
        mapping.DecimalSeparator = input.DecimalSeparator;
        mapping.Currency = input.Currency;
        mapping.Columns = input.Columns;
    }

    public static CsvMappingResponse ToResponse(this CsvImportMapping mapping) => new(
        mapping.Id.Value,
        mapping.Name,
        mapping.Encoding,
        mapping.Delimiter,
        mapping.SkipLines,
        mapping.NoHeaderRow,
        mapping.AmountStyle,
        mapping.DateFormat,
        mapping.DecimalSeparator,
        mapping.Currency,
        mapping.Columns);
}
