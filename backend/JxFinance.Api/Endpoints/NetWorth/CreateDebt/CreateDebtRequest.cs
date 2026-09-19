using System.Text.Json.Serialization;
using JxFinance.Common.Json;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.CreateDebt;

public sealed record CreateDebtRequest(
    string Name,
    DebtType Type,
    [property: Money, JsonRequired] decimal OutstandingAmount,
    decimal? InterestRate,
    DateOnly AsOf);
