using JxFinance.Domain.Common;
using JxFinance.Domain.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class EmailMessageConfiguration : IEntityTypeConfiguration<EmailMessage>
{
    public void Configure(EntityTypeBuilder<EmailMessage> builder)
    {
        builder.Property(m => m.Kind).HasConversion<string>().HasMaxLength(30);
        builder.Property(m => m.ToAddress).HasMaxLength(EmailMessage.AddressMaxLength);
        builder.Property(m => m.ToName).HasMaxLength(EmailMessage.NameMaxLength);
        builder.Property(m => m.Subject).HasMaxLength(EmailMessage.SubjectMaxLength);
        builder.Property(m => m.Body).HasMaxLength(EmailMessage.BodyMaxLength);
        builder.Property(m => m.DedupeKey).HasMaxLength(OutboxMessage.DedupeKeyMaxLength);
        builder.Property(m => m.LastError).HasMaxLength(OutboxMessage.ErrorMaxLength);
        builder.HasIndex(m => m.DedupeKey).IsUnique().HasFilter("\"DedupeKey\" IS NOT NULL");
        builder.HasIndex(m => new { m.SentAt, m.NextAttemptAt });
    }
}
