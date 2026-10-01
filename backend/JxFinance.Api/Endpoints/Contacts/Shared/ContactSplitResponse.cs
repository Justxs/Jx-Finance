using JxFinance.Common.Json;
using JxFinance.Domain.Households;

namespace JxFinance.Endpoints.Contacts.Shared;

public sealed record ContactSplitResponse(
    Guid Id,
    SplitMethod Method,
    int? OwnWeight,
    [property: Money] decimal? OwnAmount,
    IReadOnlyList<ContactShareResponse> Shares);

public sealed record ContactShareResponse(Guid ContactId, string Name, int? Weight, [property: Money] decimal Amount);
