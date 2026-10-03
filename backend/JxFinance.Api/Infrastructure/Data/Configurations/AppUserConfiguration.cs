using JxFinance.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> builder)
    {
        builder.Property(u => u.DisplayName).HasMaxLength(100);
        builder.Property(u => u.Language).HasMaxLength(5);
        builder.Property(u => u.EmailNotificationTypes).StoredAsJson().HasDefaultValueSql("'[]'::jsonb");
        builder.Property(u => u.DiscordNotificationTypes).StoredAsJson().HasDefaultValueSql("'[]'::jsonb");
        builder.Property(u => u.MonthlyDigestEverything).HasDefaultValue(true);
        builder.Property(u => u.MonthlyDigestHouseholdIds).HasDefaultValueSql("'{}'::uuid[]");
        builder.ComplexProperty(u => u.DashboardLayout, layout =>
        {
            layout.IsRequired(false);
            layout.ToJson();
            layout.Property(l => l.Order).HasJsonPropertyName("order");
            layout.Property(l => l.Hidden).HasJsonPropertyName("hidden");
        });
    }
}
