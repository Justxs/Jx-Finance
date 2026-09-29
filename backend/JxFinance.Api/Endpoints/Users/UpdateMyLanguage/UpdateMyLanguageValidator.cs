using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Users.UpdateMyLanguage;

public sealed class UpdateMyLanguageValidator : Validator<UpdateMyLanguageRequest>
{
    public UpdateMyLanguageValidator()
    {
        RuleFor(r => r.Language)
            .Must(language => AppLanguages.All.Contains(language))
            .WithErrorCode(ErrorCodes.EnumInvalid)
            .WithMessage("Language must be en or lt.");
    }
}
