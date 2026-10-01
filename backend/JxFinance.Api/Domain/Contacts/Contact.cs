using JxFinance.Domain.Common;

namespace JxFinance.Domain.Contacts;

public sealed class Contact : OwnableEntity
{
    public const int NameMaxLength = 100;

    public ContactId Id { get; set; } = ContactId.New();
    public required string Name { get; set; }
}
