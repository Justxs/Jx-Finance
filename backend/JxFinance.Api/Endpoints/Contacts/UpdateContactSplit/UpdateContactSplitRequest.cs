using System.Text.Json.Serialization;
using JxFinance.Domain.Households;
using JxFinance.Endpoints.Contacts.Shared;

namespace JxFinance.Endpoints.Contacts.UpdateContactSplit;

public sealed record UpdateContactSplitRequest(
    Guid Id,
    [property: JsonRequired] SplitMethod Method,
    OwnShareRequest? Own,
    IReadOnlyList<ContactShareRequest> Shares) : IContactSplitInput;
