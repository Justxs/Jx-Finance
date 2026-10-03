using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Users.UpdateMyDiscordNotifications;

public sealed class UpdateMyDiscordNotificationsValidator : Validator<UpdateMyDiscordNotificationsRequest>
{
    public UpdateMyDiscordNotificationsValidator()
    {
        RuleFor(r => r.Types).IsPresent();
        RuleFor(r => r.Types)
            .Must(types => types is null || types.Distinct().Count() == types.Count)
            .WithErrorCode(ErrorCodes.CollectionInvalidSize)
            .WithMessage("Each notification kind can be listed once.");
        RuleForEach(r => r.Types).IsKnownEnum();
    }
}
