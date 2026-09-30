using JxFinance.Common.Json;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.Shared;

public sealed record SecurityPriceResponse(DateOnly Date, [property: Quantity] decimal Price, PriceSourceKind Source);
