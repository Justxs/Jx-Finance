using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Telegram;

namespace JxFinance.Endpoints.Settings.UpdateTelegramSettings;

public sealed class UpdateTelegramSettingsValidator : Validator<UpdateTelegramSettingsRequest>
{
    public UpdateTelegramSettingsValidator()
    {
        RuleFor(r => r.BotToken)
            .Must(token => string.IsNullOrWhiteSpace(token) || TelegramBotToken.IsValid(token))
            .WithErrorCode(ErrorCodes.TelegramInvalidToken)
            .WithMessage("Paste the token @BotFather gave you; it looks like 123456789:AAE….");
        RuleFor(r => r.ChatId)
            .NotEqual(0)
            .WithErrorCode(ErrorCodes.TelegramInvalidChat)
            .WithMessage("Enter the id of the Telegram group, a whole number such as -1001234567890.");
    }
}
