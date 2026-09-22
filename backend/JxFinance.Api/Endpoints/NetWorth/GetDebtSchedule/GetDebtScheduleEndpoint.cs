using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Amortization;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Endpoints.NetWorth.Interfaces;
using JxFinance.Endpoints.NetWorth.Shared;

namespace JxFinance.Endpoints.NetWorth.GetDebtSchedule;

public sealed class GetDebtScheduleEndpoint(INetWorthService netWorthService) : Endpoint<GetDebtScheduleRequest, DebtScheduleResponse>
{
    public override void Configure()
    {
        Get(ApiRoutes.Debts + "/{id}/schedule");
        Group<NetWorthGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    public override async Task HandleAsync(GetDebtScheduleRequest req, CancellationToken ct)
    {
        var extra = new ExtraPayments(
            DecimalRules.ParseMoneyText(req.ExtraMonthly) ?? 0,
            DecimalRules.ParseMoneyText(req.LumpSum) ?? 0,
            req.LumpSumDate);
        var schedule = (await netWorthService.GetDebtScheduleAsync(req.Id, extra, ct)).ValueOrThrow();
        await Send.OkAsync(schedule, ct);
    }
}
