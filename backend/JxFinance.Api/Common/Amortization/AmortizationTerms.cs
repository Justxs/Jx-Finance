using JxFinance.Domain.NetWorth;

namespace JxFinance.Common.Amortization;

public sealed record AmortizationTerms(
    decimal Principal,
    decimal AnnualRatePercent,
    DateOnly FirstPaymentDate,
    int? TermMonths,
    decimal? Payment,
    AmortizationType Type = AmortizationType.Annuity)
{
    public static AmortizationTerms? From(Debt debt) =>
        debt is { LoanAmount: { } principal, InterestRate: { } rate, FirstPaymentDate: { } firstPaymentDate }
        && (debt.TermMonths is not null || (debt.MonthlyPayment is not null && debt.AmortizationType == AmortizationType.Annuity))
            ? new AmortizationTerms(
                principal.Amount,
                rate,
                firstPaymentDate,
                debt.TermMonths,
                debt.TermMonths is null ? debt.MonthlyPayment?.Amount : null,
                debt.AmortizationType)
            : null;
}
