using JxFinance.Domain.Imports;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class ImportInboxFileConfiguration : IEntityTypeConfiguration<ImportInboxFile>
{
    public void Configure(EntityTypeBuilder<ImportInboxFile> builder)
    {
        builder.Property(f => f.Format).HasConversion<string>().HasMaxLength(20);
        builder.Property(f => f.FileName).HasMaxLength(ImportInboxFile.FileNameMaxLength);
        builder.Property(f => f.Sha256).HasMaxLength(ImportInboxFile.Sha256Length).IsFixedLength();
        builder.HasOne<CsvImportMapping>().WithMany().HasForeignKey(f => f.MappingId).OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(f => f.Sha256);
    }
}
