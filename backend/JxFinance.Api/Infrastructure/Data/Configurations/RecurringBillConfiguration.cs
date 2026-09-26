using JxFinance.Domain.RecurringBills;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class RecurringBillConfiguration : IEntityTypeConfiguration<RecurringBill>
{
    public void Configure(EntityTypeBuilder<RecurringBill> builder)
    {
        builder.Property(b => b.Name).HasMaxLength(100);
        builder.Property(b => b.NextDueDate).IsConcurrencyToken();
    }
}
