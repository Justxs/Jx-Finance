using JxFinance.Domain.Common;

namespace JxFinance.Domain.Imports;

public readonly record struct CsvImportMappingId(Guid Value) : IStronglyTypedId<CsvImportMappingId>
{
    public static CsvImportMappingId From(Guid value) => new(value);

    public static CsvImportMappingId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
