using System.Text.Json;
using System.Text.Json.Serialization;
using JxFinance.Domain.Receipts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class ReceiptReadingConfiguration : IEntityTypeConfiguration<ReceiptReading>
{
    private static readonly JsonSerializerOptions ResultJson = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    private static readonly ValueComparer<ReceiptResult?> ResultComparer = new(
        (left, right) => ReferenceEquals(left, right),
        result => result == null ? 0 : result.GetHashCode(),
        result => result);

    public void Configure(EntityTypeBuilder<ReceiptReading> builder)
    {
        builder.Property(r => r.Sha256).HasMaxLength(ReceiptReading.Sha256Length).IsFixedLength();
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(r => r.Model).HasMaxLength(ReceiptModels.MaxLength);
        builder.Property(r => r.ErrorCode).HasMaxLength(ReceiptReading.ErrorCodeMaxLength);
        builder.Property(r => r.Result)
            .HasColumnType(DbSchema.Json)
            .HasConversion(
                result => result == null ? null : JsonSerializer.Serialize(result, ResultJson),
                text => text == null ? null : JsonSerializer.Deserialize<ReceiptResult>(text, ResultJson),
                ResultComparer);
        builder.HasIndex(r => new { r.UserId, r.Sha256 });
    }
}
