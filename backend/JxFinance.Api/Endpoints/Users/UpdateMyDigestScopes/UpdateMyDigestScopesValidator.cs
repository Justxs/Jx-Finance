using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Users.UpdateMyDigestScopes;

public sealed class UpdateMyDigestScopesValidator : Validator<UpdateMyDigestScopesRequest>
{
    public UpdateMyDigestScopesValidator()
    {
        RuleFor(r => r.HouseholdIds).IsPresent();
        RuleFor(r => r.HouseholdIds)
            .Must(ids => ids is null || ids.Distinct().Count() == ids.Count)
            .WithErrorCode(ErrorCodes.CollectionInvalidSize)
            .WithMessage("Each household can be listed once.");
    }
}
