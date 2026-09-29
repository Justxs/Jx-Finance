using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Households.Shared;

public sealed record ShareRequest(Guid UserId, int? Weight = null, [property: Money] decimal? Amount = null);
