using JxFinance.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> builder)
    {
        builder.Property(u => u.DisplayName).HasMaxLength(100);
        builder.ComplexProperty(u => u.DashboardLayout, layout =>
        {
            layout.IsRequired(false);
            layout.ToJson();
            layout.Property(l => l.Order).HasJsonPropertyName("order");
            layout.Property(l => l.Hidden).HasJsonPropertyName("hidden");
        });
    }
}
