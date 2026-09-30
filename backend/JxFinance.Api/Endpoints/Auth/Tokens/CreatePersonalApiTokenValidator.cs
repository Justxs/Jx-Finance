using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Auth.Tokens;

public sealed class CreatePersonalApiTokenValidator : Validator<CreatePersonalApiTokenRequest>
{
    public CreatePersonalApiTokenValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(PersonalApiToken.NameMaxLength);
        RuleFor(r => r.ExpiresInDays).IsWithin(1, PersonalApiToken.MaxLifetimeDays);
        RuleFor(r => r.ExpiresInDays)
            .Must((request, days) => request.Access != TokenAccess.ReadWrite || days <= PersonalApiToken.MaxWritableLifetimeDays)
            .WithErrorCode(ErrorCodes.RangeInvalid)
            .WithMessage($"A read-and-write token lives at most {PersonalApiToken.MaxWritableLifetimeDays} days.");
        RuleFor(r => r.Password).IsRequired();
        RuleFor(r => r.Access).IsKnownEnum();
    }
}
