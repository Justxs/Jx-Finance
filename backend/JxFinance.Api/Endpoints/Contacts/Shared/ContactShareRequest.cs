using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Contacts.Shared;

public sealed record ContactShareRequest(Guid ContactId, int? Weight = null, [property: Money] decimal? Amount = null);

public sealed record OwnShareRequest(int? Weight = null, [property: Money] decimal? Amount = null);
