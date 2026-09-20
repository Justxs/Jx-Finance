using JxFinance.Domain.Accounts;
using JxFinance.Domain.Investments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class BrokerConnectionConfiguration : IEntityTypeConfiguration<BrokerConnection>
{
    public void Configure(EntityTypeBuilder<BrokerConnection> builder)
    {
        builder.Property(c => c.QueryId).HasMaxLength(20);
        builder.Property(c => c.ProtectedToken).HasMaxLength(1000);
        builder.Property(c => c.LastError).HasMaxLength(500);
        builder.HasIndex(c => c.AccountId).IsUnique().HasFilter("\"IsDeleted\" = false");
        builder.HasOne<Account>().WithMany().HasForeignKey(c => c.AccountId).OnDelete(DeleteBehavior.Restrict);
    }
}
