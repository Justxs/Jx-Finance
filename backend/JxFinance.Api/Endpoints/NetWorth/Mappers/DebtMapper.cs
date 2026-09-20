using FastEndpoints;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Endpoints.NetWorth.CreateDebt;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.Mappers;

public sealed class DebtMapper : Mapper<CreateDebtRequest, DebtResponse, Debt>
{
    public override Debt ToEntity(CreateDebtRequest request)
    {
        var debt = new Debt { Name = request.Name };
        Apply(request, debt);
        return debt;
    }

    public void Apply(IDebtInput input, Debt debt)
    {
        debt.Name = input.Name.Trim();
        debt.Type = input.Type;
        debt.OutstandingAmount = new Money(input.OutstandingAmount!.Value);
        debt.InterestRate = input.InterestRate;
        debt.AsOf = input.AsOf;
    }

    public override DebtResponse FromEntity(Debt debt) => new(
        debt.Id.Value,
        debt.Name,
        debt.Type,
        debt.OutstandingAmount.Amount,
        debt.InterestRate,
        debt.AsOf);
}
