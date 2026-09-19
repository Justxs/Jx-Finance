using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Settings.UpdateSettings;

public sealed class UpdateSettingsValidator : Validator<UpdateSettingsRequest>
{
    private static readonly string[] Languages = ["en", "lt"];
    private static readonly int[] PageSizes = [10, 20, 50, 100];

    public UpdateSettingsValidator()
    {
        RuleFor(r => r.InstanceName).HasMaxLength(40);
        RuleFor(r => r.Features).IsPresent();
        RuleFor(r => r.ReportingCurrency).IsKnownEnum();
        RuleFor(r => r.EnabledCurrencies).IsPresent();
        RuleForEach(r => r.EnabledCurrencies).IsKnownEnum();
        RuleFor(r => r.DefaultLanguage)
            .Must(language => Languages.Contains(language))
            .WithErrorCode(ErrorCodes.EnumInvalid)
            .WithMessage("Default language must be en or lt.");
        RuleFor(r => r.TimeZone)
            .Must(InstanceSettingsSnapshot.IsValidTimeZone)
            .WithErrorCode(ErrorCodes.EnumInvalid)
            .WithMessage("Time zone must be a valid IANA time zone id, such as Europe/Vilnius.");
        RuleFor(r => r.FirstDayOfWeek).IsKnownEnum();
        RuleFor(r => r.DefaultPageSize)
            .Must(size => PageSizes.Contains(size))
            .WithErrorCode(ErrorCodes.EnumInvalid)
            .WithMessage("Default page size must be 10, 20, 50 or 100.");
    }
}
