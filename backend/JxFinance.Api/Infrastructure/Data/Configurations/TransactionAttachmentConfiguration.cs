using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class TransactionAttachmentConfiguration : IEntityTypeConfiguration<TransactionAttachment>
{
    public void Configure(EntityTypeBuilder<TransactionAttachment> builder)
    {
        builder.Property(a => a.FileName).HasMaxLength(TransactionAttachment.FileNameMaxLength);
        builder.Property(a => a.ContentType).HasMaxLength(TransactionAttachment.ContentTypeMaxLength);
        builder.Property(a => a.Sha256).HasMaxLength(TransactionAttachment.Sha256Length).IsFixedLength();
        builder.HasIndex(a => new { a.TransactionId, a.CreatedAt });
        builder.HasOne<Transaction>().WithMany().HasForeignKey(a => a.TransactionId).OnDelete(DeleteBehavior.Restrict);
    }
}
