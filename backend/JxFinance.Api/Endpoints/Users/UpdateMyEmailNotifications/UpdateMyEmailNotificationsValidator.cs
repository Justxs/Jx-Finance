using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Users.UpdateMyEmailNotifications;

public sealed class UpdateMyEmailNotificationsValidator : Validator<UpdateMyEmailNotificationsRequest>
{
    public UpdateMyEmailNotificationsValidator()
    {
        RuleFor(r => r.Types).IsPresent();
        RuleFor(r => r.Types)
            .Must(types => types is null || types.Distinct().Count() == types.Count)
            .WithErrorCode(ErrorCodes.CollectionInvalidSize)
            .WithMessage("Each notification kind can be listed once.");
        RuleForEach(r => r.Types).IsKnownEnum();
    }
}
