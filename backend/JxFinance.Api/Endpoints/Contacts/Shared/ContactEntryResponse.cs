using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Contacts;

namespace JxFinance.Endpoints.Contacts.Shared;

public enum ContactEntryKind
{
    Split,
    Payment,
}

public sealed record ContactEntryResponse(
    Guid Id,
    ContactEntryKind Kind,
    DateOnly Date,
    string? Description,
    [property: Money] decimal Amount,
    Currency Currency,
    ContactPaymentDirection? Direction,
    bool Counted);
