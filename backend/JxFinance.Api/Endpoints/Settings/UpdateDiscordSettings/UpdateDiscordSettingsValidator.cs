using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Discord;
using JxFinance.Common.Errors;

namespace JxFinance.Endpoints.Settings.UpdateDiscordSettings;

public sealed class UpdateDiscordSettingsValidator : Validator<UpdateDiscordSettingsRequest>
{
    public UpdateDiscordSettingsValidator()
    {
        RuleFor(r => r.WebhookUrl)
            .Must(url => string.IsNullOrWhiteSpace(url) || DiscordWebhookUrl.IsValid(url))
            .WithErrorCode(ErrorCodes.DiscordInvalidWebhook)
            .WithMessage("Paste the webhook URL Discord gave you; it starts with https://discord.com/api/webhooks/.");
    }
}
