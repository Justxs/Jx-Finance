namespace JxFinance.Domain.Contacts;

public sealed class ContactSplitShare
{
    public ContactSplitId ContactSplitId { get; set; }
    public ContactId ContactId { get; set; }
    public int? Weight { get; set; }
    public decimal Amount { get; set; }
}
