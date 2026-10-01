using JxFinance.Domain.NetWorth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class DebtBalanceEntryConfiguration : IEntityTypeConfiguration<DebtBalanceEntry>
{
    public void Configure(EntityTypeBuilder<DebtBalanceEntry> builder)
    {
        builder.HasKey(e => new { e.DebtId, e.Date });
        builder.Property(e => e.Note).HasMaxLength(DebtBalanceEntry.NoteMaxLength);
        builder.HasOne<Debt>().WithMany().HasForeignKey(e => e.DebtId).OnDelete(DeleteBehavior.Cascade);
    }
}
