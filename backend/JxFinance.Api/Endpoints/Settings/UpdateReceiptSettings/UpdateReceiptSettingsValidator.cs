using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Common.Validation;
using JxFinance.Domain.Receipts;

namespace JxFinance.Endpoints.Settings.UpdateReceiptSettings;

public sealed class UpdateReceiptSettingsValidator : Validator<UpdateReceiptSettingsRequest>
{
    public UpdateReceiptSettingsValidator()
    {
        RuleFor(r => r.ApiKey).HasMaxLength(UpdateReceiptSettingsRequest.ApiKeyMaxLength);
        RuleFor(r => r.ApiKey)
            .Must((request, key) => !request.Enabled
                || !string.IsNullOrWhiteSpace(key)
                || Resolve<IInstanceSettingsStore>().Current.Receipts.HasKey)
            .WithErrorCode(ErrorCodes.Required)
            .WithMessage("Enter the Anthropic API key before switching receipt reading on.");
        RuleFor(r => r.Model)
            .Must(ReceiptModels.IsAllowed)
            .WithErrorCode(ErrorCodes.ReceiptModelNotAllowed)
            .WithMessage($"Choose one of these models: {string.Join(", ", ReceiptModels.Allowed)}.");
        RuleFor(r => r.MonthlyLimit).IsWithin(1, ReceiptModels.MaxMonthlyLimit);
    }
}
