using System.Globalization;
using JxFinance.Common.Discord;
using JxFinance.Common.Email;
using JxFinance.Common.Formats;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Common.Notifications;

public static class NotificationTexts
{
    public const string MonthFormat = "yyyy-MM";

    private static readonly string[] LithuanianMonths =
    [
        "sausis", "vasaris", "kovas", "balandis", "gegužė", "birželis",
        "liepa", "rugpjūtis", "rugsėjis", "spalis", "lapkritis", "gruodis",
    ];

    public static string PagePath(NotificationType type) => type switch
    {
        NotificationType.BillDue => "/recurring-bills",
        NotificationType.BudgetWarning or NotificationType.BudgetExceeded => "/budgets",
        NotificationType.UnusualAmount or NotificationType.UnusualAmounts => "/transactions?unusual=true",
        NotificationType.RecurringPriceRise => "/recurring-bills",
        NotificationType.MonthReadyToClose => "/",
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, "This notification type has no page."),
    };

    public static string PageLink(Notification notification) =>
        notification is { Type: NotificationType.MonthReadyToClose, Payload.Month: { } month }
            ? $"{PagePath(notification.Type)}?month={month.ToString(MonthFormat, CultureInfo.InvariantCulture)}"
            : PagePath(notification.Type);

    public static string? PageUrl(Notification notification, string? siteUrl)
    {
        var site = siteUrl?.Trim().TrimEnd('/');
        return string.IsNullOrEmpty(site) ? null : $"{site}{PageLink(notification)}";
    }

    public static string MonthTitle(string language, DateOnly month) =>
        EmailTexts.IsLithuanian(language)
            ? $"{month.Year} m. {LithuanianMonths[month.Month - 1]}"
            : month.ToString("MMMM yyyy", CultureInfo.InvariantCulture);

    public static string Sentence(string language, Notification notification)
    {
        var lithuanian = EmailTexts.IsLithuanian(language);
        var payload = notification.Payload;
        return notification.Type switch
        {
            NotificationType.BillDue when payload?.DueDate is { } due => BillDue(lithuanian, payload.Shape, due),
            NotificationType.BudgetWarning when payload?.Period is { } period =>
                lithuanian
                    ? $"{PeriodName(true, period)} limitas: panaudota {payload.ThresholdPercent ?? 80}%"
                    : $"{PeriodName(false, period)} limit: {payload.ThresholdPercent ?? 80}% used",
            NotificationType.BudgetExceeded when payload?.Period is { } period =>
                lithuanian
                    ? $"{PeriodName(true, period)} limitas pasiektas"
                    : $"{PeriodName(false, period)} limit reached",
            NotificationType.UnusualAmount when payload is { Amount: { } amount, TypicalAmount: { } typical, Factor: { } factor } =>
                lithuanian
                    ? $"{Money(amount, payload.Currency)}: {Factor(factor)}× daugiau nei įprasta ({Money(typical, payload.Currency)})"
                    : $"{Money(amount, payload.Currency)}: {Factor(factor)}× the usual {Money(typical, payload.Currency)}",
            NotificationType.UnusualAmounts when payload?.Count is { } count =>
                lithuanian
                    ? $"Neįprastai didelių išlaidų: {count}"
                    : $"{count} expenses are well above their usual amount",
            NotificationType.RecurringPriceRise when payload is { Amount: { } charged, TypicalAmount: { } expected } =>
                lithuanian
                    ? $"Nuskaičiuota {Money(charged, payload.Currency)}, tikėtasi {Money(expected, payload.Currency)}"
                    : $"Charged {Money(charged, payload.Currency)}, expected {Money(expected, payload.Currency)}",
            NotificationType.MonthReadyToClose when payload?.Month is { } month =>
                lithuanian
                    ? $"{MonthTitle(language, month)} baigėsi: peržiūrėkite ir uždarykite mėnesį"
                    : $"{MonthTitle(language, month)} has ended and is ready to close",
            _ => notification.Message,
        };
    }

    public static string Discord(string language, Notification notification, string? siteUrl)
    {
        var lines = new List<string>
        {
            $"**{DiscordText.Escape(notification.Title)}**",
            DiscordText.Escape(Sentence(language, notification)),
        };
        if (PageUrl(notification, siteUrl) is { } url)
        {
            lines.Add($"<{url}>");
        }

        return TextLimit.Ellipsize(string.Join('\n', lines), DiscordMessage.ContentMaxLength);
    }

    public static string DiscordTest(string language, string product) =>
        EmailTexts.IsLithuanian(language)
            ? $"Šis kanalas gaus {DiscordText.Escape(product)} pranešimus. Jei matote šią žinutę, Discord ryšys veikia."
            : $"This channel will receive notifications from {DiscordText.Escape(product)}. If you can read this, the Discord webhook works.";

    private static string Money(string amount, Currency? currency) =>
        currency is { } code ? $"{amount} {code.ToCode()}" : amount;

    private static string Factor(decimal factor) => factor.ToString("0.#", CultureInfo.InvariantCulture);

    private static string BillDue(bool lithuanian, RecurringBillShape? shape, DateOnly due)
    {
        var date = due.ToString(DateFormats.IsoDate, CultureInfo.InvariantCulture);
        return (shape, lithuanian) switch
        {
            (RecurringBillShape.Income, true) => $"Numatoma gauti: {date}",
            (RecurringBillShape.Transfer, true) => $"Pervedimo data: {date}",
            (_, true) => $"Mokėjimo data: {date}",
            (RecurringBillShape.Income, false) => $"Expected {date}",
            (RecurringBillShape.Transfer, false) => $"Transfer due {date}",
            (_, false) => $"Payment due {date}",
        };
    }

    private static string PeriodName(bool lithuanian, BudgetPeriod period) => (period, lithuanian) switch
    {
        (BudgetPeriod.Weekly, true) => "Savaitinis",
        (BudgetPeriod.Monthly, true) => "Mėnesinis",
        (BudgetPeriod.Quarterly, true) => "Ketvirtinis",
        (BudgetPeriod.Yearly, true) => "Metinis",
        (BudgetPeriod.Weekly, false) => "Weekly",
        (BudgetPeriod.Monthly, false) => "Monthly",
        (BudgetPeriod.Quarterly, false) => "Quarterly",
        (BudgetPeriod.Yearly, false) => "Yearly",
        _ => period.ToString(),
    };
}
