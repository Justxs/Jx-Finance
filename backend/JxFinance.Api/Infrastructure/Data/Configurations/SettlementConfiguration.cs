using JxFinance.Domain.Households;
using JxFinance.Domain.Transfers;
using JxFinance.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class SettlementConfiguration : IEntityTypeConfiguration<Settlement>
{
    public void Configure(EntityTypeBuilder<Settlement> builder)
    {
        builder.ComplexProperty(s => s.Amount, money => money.HasColumns("Amount", DbSchema.CurrencyColumn));
        builder.Property(s => s.Note).HasMaxLength(Settlement.NoteMaxLength);
        builder.HasOne<AppUser>().WithMany().HasForeignKey(s => s.FromUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<AppUser>().WithMany().HasForeignKey(s => s.ToUserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Transfer>().WithMany().HasForeignKey(s => s.TransferId).OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(s => s.TransferId).IsUnique().HasFilter("\"TransferId\" IS NOT NULL AND " + DbSchema.NotDeletedFilter);
        builder.HasIndex(s => new { s.HouseholdId, s.Date });
    }
}
