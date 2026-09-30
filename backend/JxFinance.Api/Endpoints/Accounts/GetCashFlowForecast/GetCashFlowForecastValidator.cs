using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Accounts.GetCashFlowForecast;

public sealed class GetCashFlowForecastValidator : Validator<GetCashFlowForecastRequest>
{
    public GetCashFlowForecastValidator()
    {
        RuleFor(r => r.Days).IsWithin(30, 90);
        RuleFor(r => r.WhatIfAmount!.Value).IsNonZeroMoney().When(r => r.WhatIfAmount is not null).OverridePropertyName(nameof(GetCashFlowForecastRequest.WhatIfAmount));
        RuleFor(r => r)
            .Must(r => (r.WhatIfAccountId is null) == (r.WhatIfAmount is null) && (r.WhatIfAmount is null) == (r.WhatIfDate is null))
            .WithErrorCode(ErrorCodes.Required)
            .WithMessage("A what-if payment needs its account, amount and date together.")
            .WithName(nameof(GetCashFlowForecastRequest.WhatIfAmount));
    }
}
