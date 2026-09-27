using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.NetWorth.GetAssetValueHistory;

public sealed class GetAssetValueHistoryValidator : Validator<GetAssetValueHistoryRequest>
{
    public GetAssetValueHistoryValidator()
    {
        RuleFor(r => r.From).IsNotAfter(r => r.To);
    }
}
