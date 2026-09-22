using JxFinance.Domain.Accounts;
using JxFinance.Domain.Households;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.Property(a => a.Name).HasMaxLength(100);
        builder.Property(a => a.Description).HasMaxLength(500);
        builder.Property(a => a.Iban).HasMaxLength(34);
        builder.ComplexProperty(a => a.StartingBalance, money => money.HasColumns("StartingBalance", DbSchema.CurrencyColumn));
        builder.Ignore(a => a.Currency);
        builder.HasIndex(a => a.UserId);
        builder.HasIndex(a => a.HouseholdId);
        builder.HasOne<Household>().WithMany().HasForeignKey(a => a.HouseholdId).OnDelete(DeleteBehavior.Restrict);
    }
}
