using JxFinance.Domain.Contacts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class ContactPaymentConfiguration : IEntityTypeConfiguration<ContactPayment>
{
    public void Configure(EntityTypeBuilder<ContactPayment> builder)
    {
        builder.ComplexProperty(p => p.Amount, money => money.HasColumns("Amount", DbSchema.CurrencyColumn));
        builder.Property(p => p.Note).HasMaxLength(ContactPayment.NoteMaxLength);
        builder.HasOne<Contact>().WithMany().HasForeignKey(p => p.ContactId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(p => new { p.ContactId, p.Date });
    }
}
