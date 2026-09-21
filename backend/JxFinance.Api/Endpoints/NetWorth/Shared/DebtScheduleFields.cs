using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.NetWorth.Shared;

public static class DebtScheduleFields
{
    public static void DescribeDebtSchedule<TRequest>(this EndpointSummary<TRequest> summary)
        where TRequest : IDebtInput
    {
        summary.Describe(nameof(IDebtInput.LoanAmount), "Optional principal borrowed at the start, a positive decimal string.");
        summary.Describe(nameof(IDebtInput.FirstPaymentDate), "Optional date of the first monthly payment; later payments fall on the same day of the month.");
        summary.Describe(nameof(IDebtInput.TermMonths), "Optional number of monthly payments, 1 to 600. Leave monthlyPayment empty when it is set.");
        summary.Describe(nameof(IDebtInput.MonthlyPayment), "Optional fixed monthly payment of an annuity, a positive decimal string; the term is derived from it. It must repay the debt within 600 payments (debt.paymentTooSmall).");
        summary.Describe(nameof(IDebtInput.AmortizationType), "annuity (level payment, the default) or linear (equal principal, needs termMonths).");
    }
}
