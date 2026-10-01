using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Domain.Imports;

public sealed class ImportInboxFile : OwnableEntity
{
    public const int FileNameMaxLength = 255;
    public const int Sha256Length = 64;
    public const int KeptDays = 90;

    public ImportInboxFileId Id { get; set; } = ImportInboxFileId.New();
    public AccountId AccountId { get; set; }
    public StatementFormat Format { get; set; }
    public CsvImportMappingId? MappingId { get; set; }
    public required string FileName { get; set; }
    public required string Sha256 { get; set; }
    public byte[]? Content { get; set; }
}
