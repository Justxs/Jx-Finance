using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Discord;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Users.UpdateMyDiscord;

public sealed class UpdateMyDiscordValidator : Validator<UpdateMyDiscordRequest>
{
    public UpdateMyDiscordValidator()
    {
        RuleFor(r => r.WebhookUrl)
            .Must(url => string.IsNullOrWhiteSpace(url) || DiscordWebhookUrl.IsValid(url))
            .WithErrorCode(ErrorCodes.DiscordInvalidWebhook)
            .WithMessage("Paste the webhook URL Discord gave you; it starts with https://discord.com/api/webhooks/.");
        RuleFor(r => r.Types).IsPresent();
        RuleFor(r => r.Types)
            .Must(types => types is null || types.Distinct().Count() == types.Count)
            .WithErrorCode(ErrorCodes.CollectionInvalidSize)
            .WithMessage("Each notification kind can be listed once.");
        RuleForEach(r => r.Types).IsKnownEnum();
    }
}
