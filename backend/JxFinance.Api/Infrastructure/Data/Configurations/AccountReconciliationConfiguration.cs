using JxFinance.Domain.Accounts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class AccountReconciliationConfiguration : IEntityTypeConfiguration<AccountReconciliation>
{
    public void Configure(EntityTypeBuilder<AccountReconciliation> builder)
    {
        builder.ComplexProperty(r => r.Balance, money => money.HasColumns("Balance", DbSchema.CurrencyColumn));
        builder.HasIndex(r => new { r.AccountId, r.Date }).IsUnique();
    }
}
