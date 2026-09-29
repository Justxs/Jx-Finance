using JxFinance.Domain.Receipts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class ReceiptItemCategoryConfiguration : IEntityTypeConfiguration<ReceiptItemCategory>
{
    public void Configure(EntityTypeBuilder<ReceiptItemCategory> builder)
    {
        builder.Property(c => c.Key).HasMaxLength(ReceiptResult.TextMaxLength);
        builder.HasIndex(c => new { c.UserId, c.Key }).IsUnique();
        builder.HasIndex(c => c.CategoryId);
    }
}
