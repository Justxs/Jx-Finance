using FastEndpoints;
using JxFinance.Common.Validation;
using JxFinance.Infrastructure.Auth;

namespace JxFinance.Endpoints.Auth.Tokens;

public sealed class CreatePersonalApiTokenValidator : Validator<CreatePersonalApiTokenRequest>
{
    public CreatePersonalApiTokenValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(PersonalApiToken.NameMaxLength);
        RuleFor(r => r.ExpiresInDays).IsWithin(1, PersonalApiToken.MaxLifetimeDays);
        RuleFor(r => r.Password).IsRequired();
    }
}
