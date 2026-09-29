using System.Text.Json;
using System.Text.Json.Serialization;
using JxFinance.Domain.Imports;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class CsvImportMappingConfiguration : IEntityTypeConfiguration<CsvImportMapping>
{
    private static readonly JsonSerializerOptions ColumnsJson = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private static readonly ValueComparer<CsvColumnMap> ColumnsComparer = new(
        (left, right) => left == null ? right == null : left.Equals(right),
        columns => columns.GetHashCode(),
        columns => columns);

    public void Configure(EntityTypeBuilder<CsvImportMapping> builder)
    {
        builder.Property(m => m.Name).HasMaxLength(CsvImportMapping.NameMaxLength);
        builder.Property(m => m.Encoding).HasConversion<string>().HasMaxLength(20);
        builder.Property(m => m.Delimiter).HasMaxLength(1);
        builder.Property(m => m.AmountStyle).HasConversion<string>().HasMaxLength(30);
        builder.Property(m => m.DateFormat).HasMaxLength(CsvDateFormats.MaxLength);
        builder.Property(m => m.DecimalSeparator).HasConversion<string>().HasMaxLength(10);
        builder.Property(m => m.Columns)
            .HasColumnType(DbSchema.Json)
            .HasConversion(
                columns => JsonSerializer.Serialize(columns, ColumnsJson),
                text => JsonSerializer.Deserialize<CsvColumnMap>(text, ColumnsJson)!,
                ColumnsComparer);
        builder.HasIndex(m => new { m.UserId, m.Name }).HasFilter(DbSchema.NotDeletedFilter);
    }
}
