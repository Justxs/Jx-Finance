using FastEndpoints;
using JxFinance.Common.Amortization;
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
        debt.LoanAmount = input.LoanAmount is { } loanAmount ? new Money(loanAmount) : null;
        debt.FirstPaymentDate = input.FirstPaymentDate;
        debt.TermMonths = input.TermMonths;
        debt.MonthlyPayment = input.MonthlyPayment is { } payment ? new Money(payment) : null;
        debt.AmortizationType = input.AmortizationType ?? AmortizationType.Annuity;
    }

    public override DebtResponse FromEntity(Debt debt) => new(
        debt.Id.Value,
        debt.Name,
        debt.Type,
        debt.OutstandingAmount.Amount,
        debt.InterestRate,
        debt.AsOf,
        debt.LoanAmount?.Amount,
        debt.FirstPaymentDate,
        debt.TermMonths,
        debt.MonthlyPayment?.Amount,
        debt.AmortizationType,
        PayoffDate(debt));

    private static DateOnly? PayoffDate(Debt debt) =>
        AmortizationTerms.From(debt) is { } terms && AmortizationCalculator.Calculate(terms).TryGetValue(out var schedule)
            ? schedule.PayoffDate
            : null;
}
