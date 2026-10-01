using JxFinance.Common.Json;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Contacts.Shared;

public sealed record ContactResponse(Guid Id, string Name, IReadOnlyList<ContactBalanceResponse> Balances);

public sealed record ContactBalanceResponse(Currency Currency, [property: Money] decimal Amount);
