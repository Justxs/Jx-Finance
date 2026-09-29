using JxFinance.Domain.Receipts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class ReceiptReadingUsageConfiguration : IEntityTypeConfiguration<ReceiptReadingUsage>
{
    public void Configure(EntityTypeBuilder<ReceiptReadingUsage> builder)
    {
        builder.HasKey(u => u.Month);
    }
}
