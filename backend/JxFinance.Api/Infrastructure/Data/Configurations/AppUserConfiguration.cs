using System.Text.Json;
using JxFinance.Domain.Dashboard;
using JxFinance.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    private static readonly JsonSerializerOptions LayoutJson = new(JsonSerializerDefaults.Web);

    private static readonly ValueComparer<DashboardLayout?> LayoutComparer = new(
        (left, right) => Serialize(left) == Serialize(right),
        layout => Serialize(layout).GetHashCode(StringComparison.Ordinal),
        layout => layout);

    public void Configure(EntityTypeBuilder<AppUser> builder)
    {
        builder.Property(u => u.DisplayName).HasMaxLength(100);
        builder.Property(u => u.DashboardLayout)
            .HasColumnType(DbSchema.Json)
            .HasConversion(
                layout => JsonSerializer.Serialize(layout, LayoutJson),
                json => JsonSerializer.Deserialize<DashboardLayout>(json, LayoutJson),
                LayoutComparer);
    }

    private static string Serialize(DashboardLayout? layout) =>
        layout is null ? string.Empty : JsonSerializer.Serialize(layout, LayoutJson);
}
