using JxFinance.Domain.Imports;

namespace JxFinance.Endpoints.Imports.InspectCsv;

public sealed record InspectCsvResponse(
    CsvEncoding Encoding,
    string Delimiter,
    int SkipLines,
    bool NoHeaderRow,
    IReadOnlyList<InspectCsvColumn> Columns,
    IReadOnlyList<IReadOnlyList<string>> Samples,
    IReadOnlyList<Guid> MatchingMappingIds);

public sealed record InspectCsvColumn(string Name, IReadOnlyList<string> DateFormats, CsvDecimalSeparator? DecimalSeparator);
