using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.CreateHousehold;

public sealed record CreateHouseholdRequest(string Name) : IHouseholdInput;
