using JxFinance.Domain.Households;

namespace JxFinance.Endpoints.Contacts.Shared;

public interface IContactSplitInput
{
    SplitMethod Method { get; }
    OwnShareRequest? Own { get; }
    IReadOnlyList<ContactShareRequest> Shares { get; }
}
