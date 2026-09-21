using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Investments.GetValueHistory;

public sealed class GetValueHistoryValidator : Validator<GetValueHistoryRequest>
{
    public GetValueHistoryValidator()
    {
        RuleFor(r => r.From)
            .Must((request, from) => from is null || request.To is null || from <= request.To)
            .WithErrorCode(ErrorCodes.RangeInvalid)
            .WithMessage("The start of the range must not be after its end.");
    }
}
