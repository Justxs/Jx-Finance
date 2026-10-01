using JxFinance.Common;

namespace JxFinance.Endpoints.Contacts.GetContactEntries;

public sealed class GetContactEntriesRequest : PagedRequest
{
    public Guid Id { get; init; }
}
