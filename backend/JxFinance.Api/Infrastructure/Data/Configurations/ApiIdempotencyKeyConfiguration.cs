using JxFinance.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class ApiIdempotencyKeyConfiguration : IEntityTypeConfiguration<ApiIdempotencyKey>
{
    public void Configure(EntityTypeBuilder<ApiIdempotencyKey> builder)
    {
        builder.HasKey(k => new { k.TokenId, k.Key });
        builder.Property(k => k.Key).HasMaxLength(ApiIdempotencyKey.KeyMaxLength);
        builder.Property(k => k.RequestHash).HasMaxLength(ApiIdempotencyKey.RequestHashLength).IsFixedLength();
        builder.Property(k => k.Body).HasColumnType(DbSchema.Json);
        builder.Property(k => k.Location).HasMaxLength(ApiIdempotencyKey.LocationMaxLength);
        builder.HasOne<PersonalApiToken>().WithMany().HasForeignKey(k => k.TokenId).OnDelete(DeleteBehavior.Cascade);
    }
}
