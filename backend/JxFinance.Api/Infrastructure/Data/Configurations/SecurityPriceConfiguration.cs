using JxFinance.Domain.Investments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class SecurityPriceConfiguration : IEntityTypeConfiguration<SecurityPrice>
{
    public void Configure(EntityTypeBuilder<SecurityPrice> builder)
    {
        builder.HasKey(p => new { p.SecurityId, p.Date });
        builder.Property(p => p.Price).HasPrecision(18, 8);
        builder.HasOne<Security>().WithMany().HasForeignKey(p => p.SecurityId).OnDelete(DeleteBehavior.Cascade);
    }
}
