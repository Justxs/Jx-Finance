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
        NotificationType.MonthReadyToClose or NotificationType.MonthlyDigest => "/",
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, "This notification type has no page."),
    };

    public static string PageLink(Notification notification) =>
        notification is { Type: NotificationType.MonthReadyToClose or NotificationType.MonthlyDigest, Payload.Month: { } month }
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

    public static string Title(string language, Notification notification) =>
        notification is { Type: NotificationType.MonthReadyToClose or NotificationType.MonthlyDigest, Payload.Month: { } month }
            ? MonthTitle(language, month)
            : notification.Title;

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
            NotificationType.MonthlyDigest when payload is { Month: { } month, Digest: { } digest } =>
                DigestSentence(language, month, digest),
            _ => notification.Message,
        };
    }

    public static string Discord(string language, Notification notification, string? siteUrl)
    {
        var lines = new List<string>
        {
            $"**{DiscordText.Escape(Title(language, notification))}**",
            DiscordText.Escape(Sentence(language, notification)),
        };
        lines.AddRange(DigestDetails(language, notification).Select(DiscordText.Escape));
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

    public static IReadOnlyList<string> DigestDetails(string language, Notification notification)
    {
        if (notification is not { Type: NotificationType.MonthlyDigest, Payload.Digest: { } digest })
        {
            return [];
        }

        var lithuanian = EmailTexts.IsLithuanian(language);
        var lines = new List<string>();
        if (digest.Movers.Count > 0)
        {
            var movers = string.Join(", ", digest.Movers.Select(mover => lithuanian
                ? $"{mover.Name} {Money(mover.Amount, digest.Currency)} (buvo {Money(mover.Previous, digest.Currency)})"
                : $"{mover.Name} {Money(mover.Amount, digest.Currency)} (was {Money(mover.Previous, digest.Currency)})"));
            lines.Add(lithuanian ? $"Labiausiai pasikeitė: {movers}" : $"Biggest changes: {movers}");
        }

        var open = new (int? Count, string Lt, string En)[]
        {
            (digest.Uncategorized, "be kategorijos", "uncategorised"),
            (digest.Unusual, "neįprastos sumos", "unusual amounts"),
            (digest.UnconfirmedRecurring, "nepatvirtinti periodiniai įrašai", "unconfirmed recurring entries"),
            (digest.AccountsNeedingAttention, "nesuderintos sąskaitos", "accounts not reconciled"),
        }
            .Where(item => item.Count > 0)
            .Select(item => $"{(lithuanian ? item.Lt : item.En)} {item.Count}")
            .ToList();
        lines.Add((open.Count, lithuanian) switch
        {
            (0, true) => "Nieko daryti nebereikia.",
            (0, false) => "Nothing left to do.",
            (_, true) => $"Liko padaryti: {string.Join(", ", open)}.",
            (_, false) => $"Still to do: {string.Join(", ", open)}.",
        });
        lines.Add((digest.Closed, lithuanian) switch
        {
            (true, true) => "Mėnuo uždarytas.",
            (false, true) => "Mėnuo dar neuždarytas.",
            (true, false) => "The month is closed.",
            (false, false) => "The month is not closed yet.",
        });
        return lines;
    }

    private static string DigestSentence(string language, DateOnly month, MonthlyDigestPayload digest)
    {
        var lithuanian = EmailTexts.IsLithuanian(language);
        var (income, expense, net) = (
            Money(digest.Income, digest.Currency),
            Money(digest.Expense, digest.Currency),
            Money(digest.Net, digest.Currency));
        var kept = (digest.KeptPercent, lithuanian) switch
        {
            (null, _) => "",
            ({ } percent, true) => $", sutaupyta {percent}%",
            ({ } percent, false) => $", {percent}% kept",
        };
        return lithuanian
            ? $"{MonthTitle(language, month)}: pajamos {income}, išlaidos {expense}, grynai {net}{kept}"
            : $"{MonthTitle(language, month)}: income {income}, expenses {expense}, net {net}{kept}";
    }

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
