using JxFinance.Domain.NetWorth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class AssetValuationConfiguration : IEntityTypeConfiguration<AssetValuation>
{
    public void Configure(EntityTypeBuilder<AssetValuation> builder)
    {
        builder.HasKey(v => new { v.AssetId, v.Date });
        builder.Property(v => v.Note).HasMaxLength(AssetValuation.NoteMaxLength);
        builder.HasOne<Asset>().WithMany().HasForeignKey(v => v.AssetId).OnDelete(DeleteBehavior.Cascade);
    }
}
