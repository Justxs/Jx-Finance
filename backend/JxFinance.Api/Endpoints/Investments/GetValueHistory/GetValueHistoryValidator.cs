using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Investments.GetValueHistory;

public sealed class GetValueHistoryValidator : Validator<GetValueHistoryRequest>
{
    public GetValueHistoryValidator()
    {
        RuleFor(r => r.From).IsNotAfter(r => r.To);
    }
}
