using JxFinance.Domain.Transfers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class TransferImportConfiguration : IEntityTypeConfiguration<TransferImport>
{
    public void Configure(EntityTypeBuilder<TransferImport> builder)
    {
        builder.Property(r => r.ImportRef).HasMaxLength(64);
        builder.HasIndex(r => new { r.AccountId, r.ImportRef }).IsUnique();
    }
}
