using FastEndpoints;
using JxFinance.Common.Amortization;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.NetWorth;
using JxFinance.Endpoints.NetWorth.CreateDebt;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.Mappers;

public sealed class DebtMapper : Mapper<CreateDebtRequest, DebtResponse, Debt>
{
    public override Debt ToEntity(CreateDebtRequest request)
    {
        var debt = new Debt
        {
            Name = request.Name,
            OutstandingAmount = new Money(0m, Resolve<IInstanceSettingsStore>().Current.ReportingCurrency),
        };
        Apply(request, debt);
        return debt;
    }

    public void Apply(IDebtInput input, Debt debt)
    {
        debt.Name = input.Name.Trim();
        debt.Type = input.Type;
        debt.OutstandingAmount = new Money(input.OutstandingAmount!.Value, debt.Currency);
        debt.InterestRate = input.InterestRate;
        debt.AsOf = input.AsOf;
        debt.LoanAmount = input.LoanAmount;
        debt.FirstPaymentDate = input.FirstPaymentDate;
        debt.TermMonths = input.TermMonths;
        debt.MonthlyPayment = input.MonthlyPayment;
        debt.AmortizationType = input.AmortizationType ?? AmortizationType.Annuity;
    }

    public override DebtResponse FromEntity(Debt debt) => new(
        debt.Id.Value,
        debt.Name,
        debt.Type,
        debt.OutstandingAmount.Amount,
        debt.InterestRate,
        debt.AsOf,
        debt.LoanAmount,
        debt.FirstPaymentDate,
        debt.TermMonths,
        debt.MonthlyPayment,
        debt.AmortizationType,
        PayoffDate(debt),
        debt.Currency);

    private static DateOnly? PayoffDate(Debt debt) =>
        AmortizationTerms.From(debt) is { } terms && AmortizationCalculator.Calculate(terms).TryGetValue(out var schedule)
            ? schedule.PayoffDate
            : null;
}
