using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Settings.UpdateMarketPriceSettings;

public sealed class UpdateMarketPriceSettingsValidator : Validator<UpdateMarketPriceSettingsRequest>
{
    public UpdateMarketPriceSettingsValidator() =>
        RuleFor(r => r.EodhdApiKey).HasMaxLength(200);
}
