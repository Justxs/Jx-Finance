using FastEndpoints;
using JxFinance.Common.OpenApi;

namespace JxFinance.Endpoints.NetWorth.GetDebtSchedule;

public sealed class GetDebtScheduleSummary : Summary<GetDebtScheduleEndpoint, GetDebtScheduleRequest>
{
    public GetDebtScheduleSummary()
    {
        Summary = "Get the repayment schedule of a debt";
        Description = "Computes the monthly amortization schedule of a debt from its loan amount, annual interest rate, "
            + "first payment date and either its term or its fixed monthly payment. Every row splits the payment into "
            + "interest and principal, amounts are rounded to cents and the last payment absorbs the rounding. "
            + "The schedule is computed on every request and never stored. With extraMonthly or lumpSum the response "
            + "also carries withExtra, the same debt repaid with those overpayments, and what they save.";
        Params["id"] = "The debt id.";
        RequestParam(r => r.ExtraMonthly, "Optional overpayment added to every monthly payment, as a decimal string such as \"100.00\".");
        RequestParam(r => r.LumpSum, "Optional one-off overpayment, as a decimal string. Needs lumpSumDate.");
        RequestParam(r => r.LumpSumDate, "The date of the one-off overpayment; it is paid with the first scheduled payment on or after it.");
        Responses[200] = "The schedule, its totals and the scheduled balance as of today.";
        Responses[400] = SummaryText.ValidationFailed
            + " debt.scheduleIncomplete when the debt lacks a loan amount, rate, first payment date, or term and payment; "
            + "debt.paymentTooSmall when the payment does not repay it within 50 years.";
        Responses[404] = "No such debt belongs to the signed-in user.";
    }
}
