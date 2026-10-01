using JxFinance.Domain.Contacts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class ContactSplitShareConfiguration : IEntityTypeConfiguration<ContactSplitShare>
{
    public void Configure(EntityTypeBuilder<ContactSplitShare> builder)
    {
        builder.HasKey(s => new { s.ContactSplitId, s.ContactId });
        builder.HasOne<ContactSplit>().WithMany().HasForeignKey(s => s.ContactSplitId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Contact>().WithMany().HasForeignKey(s => s.ContactId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(s => s.ContactId);
    }
}
