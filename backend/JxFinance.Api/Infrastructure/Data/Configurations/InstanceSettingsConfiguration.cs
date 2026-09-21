using JxFinance.Domain.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class InstanceSettingsConfiguration : IEntityTypeConfiguration<InstanceSettings>
{
    public void Configure(EntityTypeBuilder<InstanceSettings> builder)
    {
        builder.Property(s => s.Id).ValueGeneratedNever();
        builder.ComplexProperty(s => s.Features, features =>
            features.Property(f => f.CategorizationRules).HasDefaultValue(true));
        builder.Property(s => s.InstanceName).HasMaxLength(40);
        builder.Property(s => s.EnabledCurrencyCodes).HasMaxLength(200);
        builder.Property(s => s.DefaultLanguage).HasMaxLength(5);
        builder.Property(s => s.TimeZone).HasMaxLength(64);
        builder.Property(s => s.FirstDayOfWeek).HasConversion<string>().HasMaxLength(10);
        builder.Property(s => s.SmtpHost).HasMaxLength(255);
        builder.Property(s => s.SmtpEncryption).HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.SmtpUserName).HasMaxLength(255);
        builder.Property(s => s.SmtpProtectedPassword).HasMaxLength(1000);
        builder.Property(s => s.SmtpFromAddress).HasMaxLength(320);
        builder.Property(s => s.SmtpFromName).HasMaxLength(100);
    }
}
