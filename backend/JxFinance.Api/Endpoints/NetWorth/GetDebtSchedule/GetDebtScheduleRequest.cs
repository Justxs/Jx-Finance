namespace JxFinance.Endpoints.NetWorth.GetDebtSchedule;

public sealed class GetDebtScheduleRequest
{
    public Guid Id { get; init; }

    public string? ExtraMonthly { get; init; }

    public string? LumpSum { get; init; }

    public DateOnly? LumpSumDate { get; init; }
}
