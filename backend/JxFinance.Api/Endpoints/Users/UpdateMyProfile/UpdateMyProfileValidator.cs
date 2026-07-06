using FastEndpoints;
using FluentValidation;

namespace JxFinance.Endpoints.Users.UpdateMyProfile;

public sealed class UpdateMyProfileValidator : Validator<UpdateMyProfileRequest>
{
    public UpdateMyProfileValidator()
    {
        RuleFor(r => r.DisplayName).NotEmpty().MaximumLength(100);
        RuleFor(r => r.NewPassword).MinimumLength(8).MaximumLength(100).When(r => r.NewPassword is not null);
        RuleFor(r => r.CurrentPassword).NotEmpty()
            .WithMessage("Current password is required to set a new password.")
            .When(r => r.NewPassword is not null);
    }
}
