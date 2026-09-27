using FastEndpoints;

namespace JxFinance.Endpoints.NetWorth.GetDebtPaymentCandidates;

public sealed class GetDebtPaymentCandidatesSummary : Summary<GetDebtPaymentCandidatesEndpoint, GetDebtPaymentCandidatesRequest>
{
    public GetDebtPaymentCandidatesSummary()
    {
        Summary = "Suggest transactions to link to a debt";
        Description = "Lists up to 50 expense transactions that are not split and not linked to any of the signed-in "
            + "user's debts, best matches first. A description equal to the name of a recurring entry that pays this "
            + "debt, or to the description of a payment already linked, counts most; an amount within 5% of the "
            + "schedule's regular payment counts next. Ties go to the newest.";
        Params["id"] = "The debt id.";
        RequestParam(r => r.From, "Optional first date to look at. Defaults to the day after the as-of date of the debt.");
        Responses[200] = "The candidate transactions, best matches first.";
        Responses[404] = "No such debt belongs to the signed-in user.";
    }
}
