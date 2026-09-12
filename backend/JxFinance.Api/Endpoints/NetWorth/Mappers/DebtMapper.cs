using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Endpoints.NetWorth.CreateDebt;
using JxFinance.Endpoints.NetWorth.Shared;
using JxFinance.Endpoints.NetWorth.UpdateDebt;

namespace JxFinance.Endpoints.NetWorth.Mappers;

public sealed class DebtMapper : Mapper<CreateDebtRequest, DebtResponse, Debt>
{
    public override Debt ToEntity(CreateDebtRequest request) => new()
    {
        Name = request.Name.Trim(),
        Type = request.Type,
        OutstandingAmount = MoneyWire.Parse(request.OutstandingAmount),
        InterestRate = request.InterestRate,
        AsOf = request.AsOf,
    };

    public void UpdateEntity(UpdateDebtRequest request, Debt debt)
    {
        debt.Name = request.Name.Trim();
        debt.Type = request.Type;
        debt.OutstandingAmount = MoneyWire.Parse(request.OutstandingAmount);
        debt.InterestRate = request.InterestRate;
        debt.AsOf = request.AsOf;
    }

    public override DebtResponse FromEntity(Debt debt) => new(
        debt.Id.Value,
        debt.Name,
        debt.Type,
        MoneyWire.ToWire(debt.OutstandingAmount),
        debt.InterestRate,
        debt.AsOf);
}
