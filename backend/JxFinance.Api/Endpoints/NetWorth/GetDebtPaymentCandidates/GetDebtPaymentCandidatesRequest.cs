namespace JxFinance.Endpoints.NetWorth.GetDebtPaymentCandidates;

public sealed class GetDebtPaymentCandidatesRequest
{
    public Guid Id { get; init; }

    public DateOnly? From { get; init; }
}
