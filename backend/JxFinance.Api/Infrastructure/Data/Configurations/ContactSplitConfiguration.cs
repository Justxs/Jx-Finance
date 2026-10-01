using JxFinance.Domain.Contacts;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class ContactSplitConfiguration : IEntityTypeConfiguration<ContactSplit>
{
    public void Configure(EntityTypeBuilder<ContactSplit> builder)
    {
        builder.ComplexProperty(s => s.Amount, money => money.HasColumns("Amount", DbSchema.CurrencyColumn));
        builder.Property(s => s.Description).HasMaxLength(ContactSplit.DescriptionMaxLength);
        builder.HasOne<Transaction>().WithMany().HasForeignKey(s => s.TransactionId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(s => s.TransactionId).IsUnique().HasFilter(DbSchema.NotDeletedFilter);
    }
}
