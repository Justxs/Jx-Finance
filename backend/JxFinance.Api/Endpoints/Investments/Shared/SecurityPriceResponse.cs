using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Investments.Shared;

public sealed record SecurityPriceResponse(DateOnly Date, [property: Quantity] decimal Price);
