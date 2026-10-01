using JxFinance.Domain.Common;

namespace JxFinance.Domain.Contacts;

public sealed class ContactPayment : OwnableEntity
{
    public const int NoteMaxLength = 200;

    public ContactPaymentId Id { get; set; } = ContactPaymentId.New();
    public ContactId ContactId { get; set; }
    public ContactPaymentDirection Direction { get; set; }
    public Money Amount { get; set; }
    public DateOnly Date { get; set; }
    public string? Note { get; set; }
}
