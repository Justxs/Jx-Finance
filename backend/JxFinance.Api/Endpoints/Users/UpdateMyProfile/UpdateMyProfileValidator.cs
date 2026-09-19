using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Users.UpdateMyProfile;

public sealed class UpdateMyProfileValidator : Validator<UpdateMyProfileRequest>
{
    public UpdateMyProfileValidator()
    {
        RuleFor(r => r.DisplayName).IsRequired().HasMaxLength(100);
        RuleFor(r => r.NewPassword).HasMinLength(8).HasMaxLength(100).When(r => r.NewPassword is not null);
        RuleFor(r => r.CurrentPassword).IsRequired()
            .WithMessage("Current password is required to set a new password.")
            .When(r => r.NewPassword is not null);
    }
}
