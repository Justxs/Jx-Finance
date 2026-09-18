using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Settings;

namespace JxFinance.Endpoints.Settings.UpdateSettings;

public sealed class UpdateSettingsValidator : Validator<UpdateSettingsRequest>
{
    private static readonly string[] Languages = ["en", "lt"];
    private static readonly int[] PageSizes = [10, 20, 50, 100];

    public UpdateSettingsValidator()
    {
        RuleFor(r => r.InstanceName).MaximumLength(40);
        RuleFor(r => r.Features).NotNull();
        RuleFor(r => r.ReportingCurrency).IsInEnum();
        RuleFor(r => r.EnabledCurrencies).NotNull();
        RuleForEach(r => r.EnabledCurrencies).IsInEnum();
        RuleFor(r => r.DefaultLanguage)
            .Must(language => Languages.Contains(language))
            .WithMessage("Default language must be en or lt.");
        RuleFor(r => r.TimeZone)
            .Must(InstanceSettingsSnapshot.IsValidTimeZone)
            .WithMessage("Time zone must be a valid IANA time zone id, such as Europe/Vilnius.");
        RuleFor(r => r.FirstDayOfWeek).IsInEnum();
        RuleFor(r => r.DefaultPageSize)
            .Must(size => PageSizes.Contains(size))
            .WithMessage("Default page size must be 10, 20, 50 or 100.");
    }
}
