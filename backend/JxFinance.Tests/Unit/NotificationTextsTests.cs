using JxFinance.Common.Discord;
using JxFinance.Common.Notifications;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Common;
using JxFinance.Domain.Notifications;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Tests.Unit;

public sealed class NotificationTextsTests
{
    private const string RawMessage = "raw-message-7f3a";

    public static TheoryData<NotificationType, string> EveryTypeInEveryLanguage()
    {
        var data = new TheoryData<NotificationType, string>();
        foreach (var type in Enum.GetValues<NotificationType>())
        {
            data.Add(type, "en");
            data.Add(type, "lt");
        }

        return data;
    }

    [Theory]
    [MemberData(nameof(EveryTypeInEveryLanguage))]
    public void Every_notification_type_has_a_sentence_and_a_page(NotificationType type, string language)
    {
        var notification = Sample(type);

        var sentence = NotificationTexts.Sentence(language, notification);
        var page = NotificationTexts.PagePath(type);

        Assert.False(string.IsNullOrWhiteSpace(sentence));
        Assert.NotEqual(RawMessage, sentence);
        Assert.StartsWith("/", page, StringComparison.Ordinal);
    }

    [Fact]
    public void Lithuanian_and_English_sentences_differ()
    {
        var notification = Sample(NotificationType.BudgetWarning);

        Assert.Equal("Monthly limit: 80% used", NotificationTexts.Sentence("en", notification));
        Assert.Equal("Mėnesinis limitas: panaudota 80%", NotificationTexts.Sentence("lt", notification));
    }

    [Theory]
    [InlineData(RecurringBillShape.Expense, "Payment due 2026-10-05")]
    [InlineData(RecurringBillShape.Income, "Expected 2026-10-05")]
    [InlineData(RecurringBillShape.Transfer, "Transfer due 2026-10-05")]
    public void A_bill_reads_by_its_shape(RecurringBillShape shape, string expected)
    {
        var notification = Sample(NotificationType.BillDue);
        notification.Payload = notification.Payload! with { Shape = shape };

        Assert.Equal(expected, NotificationTexts.Sentence("en", notification));
    }

    [Fact]
    public void The_discord_message_escapes_markdown_and_links_to_the_page()
    {
        var notification = Sample(NotificationType.BillDue);
        notification.Title = "*Rent* @everyone [click](https://evil.example)";

        var content = NotificationTexts.Discord("en", notification, "https://finance.test/");

        Assert.StartsWith(@"**\*Rent\* @everyone \[click\]\(https://evil.example\)**", content, StringComparison.Ordinal);
        Assert.EndsWith("<https://finance.test/recurring-bills>", content, StringComparison.Ordinal);
    }

    [Fact]
    public void Without_a_site_url_there_is_no_link_line()
    {
        var content = NotificationTexts.Discord("en", Sample(NotificationType.BudgetExceeded), "");

        Assert.Equal(2, content.Split('\n').Length);
    }

    [Fact]
    public void A_long_title_is_clipped_to_the_discord_limit()
    {
        var notification = Sample(NotificationType.BudgetExceeded);
        notification.Title = new string('x', 5000);

        var content = NotificationTexts.Discord("en", notification, "https://finance.test");

        Assert.Equal(DiscordMessage.ContentMaxLength, content.Length);
        Assert.EndsWith("…", content, StringComparison.Ordinal);
    }

    [Fact]
    public void Line_breaks_in_names_cannot_start_new_markdown_lines()
    {
        Assert.Equal(@"Rent \# heading", DiscordText.Escape("Rent\n# heading"));
    }

    [Theory]
    [InlineData("Jx Finance", "Jx Finance")]
    [InlineData("  Our books  ", "Our books")]
    [InlineData("My Discord bot", "Jx Finance")]
    [InlineData("clyde", "Jx Finance")]
    [InlineData("", "Jx Finance")]
    public void The_username_avoids_names_discord_refuses(string product, string expected)
    {
        Assert.Equal(expected, DiscordText.Username(product));
    }

    private static Notification Sample(NotificationType type) => new()
    {
        UserId = Guid.NewGuid(),
        Type = type,
        Title = "Groceries",
        Message = RawMessage,
        Payload = new NotificationPayload
        {
            DueDate = new DateOnly(2026, 10, 5),
            Shape = RecurringBillShape.Expense,
            ThresholdPercent = 80,
            Period = BudgetPeriod.Monthly,
            TransactionId = Guid.NewGuid(),
            BillId = Guid.NewGuid(),
            Amount = "126.00",
            TypicalAmount = "41.50",
            Factor = 3.04m,
            Count = 5,
            Currency = Currency.Eur,
            Month = new DateOnly(2026, 8, 1),
            Digest = new MonthlyDigestPayload(
                Currency.Eur,
                "3200.00",
                "2450.00",
                "750.00",
                23,
                [new MonthlyDigestMover("Groceries", "420.00", "380.00")],
                3,
                0,
                null,
                1,
                false),
        },
    };

    [Fact]
    public void A_month_ready_to_close_names_the_month_and_links_to_it()
    {
        var notification = Sample(NotificationType.MonthReadyToClose);

        Assert.Equal("August 2026 has ended and is ready to close", NotificationTexts.Sentence("en", notification));
        Assert.StartsWith("2026 m. rugpjūtis baigėsi", NotificationTexts.Sentence("lt", notification), StringComparison.Ordinal);
        Assert.EndsWith("<https://finance.test/?month=2026-08>", NotificationTexts.Discord("en", notification, "https://finance.test"), StringComparison.Ordinal);
    }

    [Fact]
    public void A_digest_reads_in_the_recipients_language_with_its_details_on_discord()
    {
        var notification = Sample(NotificationType.MonthlyDigest);

        Assert.Equal(
            "August 2026: income 3200.00 EUR, expenses 2450.00 EUR, net 750.00 EUR, 23% kept",
            NotificationTexts.Sentence("en", notification));
        Assert.Equal(
            "2026 m. rugpjūtis: pajamos 3200.00 EUR, išlaidos 2450.00 EUR, grynai 750.00 EUR, sutaupyta 23%",
            NotificationTexts.Sentence("lt", notification));
        Assert.Equal(
            [
                "**August 2026**",
                "August 2026: income 3200.00 EUR, expenses 2450.00 EUR, net 750.00 EUR, 23% kept",
                @"Biggest changes: Groceries 420.00 EUR \(was 380.00 EUR\)",
                "Still to do: uncategorised 3, accounts not reconciled 1.",
                "The month is not closed yet.",
                "<https://finance.test/?month=2026-08>",
            ],
            NotificationTexts.Discord("en", notification, "https://finance.test").Split('\n'));
    }

    [Fact]
    public void A_digest_without_open_items_or_income_says_so()
    {
        var notification = Sample(NotificationType.MonthlyDigest);
        notification.Payload = notification.Payload! with
        {
            Digest = notification.Payload.Digest! with { KeptPercent = null, Uncategorized = 0, AccountsNeedingAttention = 0, Closed = true },
        };

        Assert.EndsWith("net 750.00 EUR", NotificationTexts.Sentence("en", notification), StringComparison.Ordinal);
        Assert.Equal(
            ["Labiausiai pasikeitė: Groceries 420.00 EUR (buvo 380.00 EUR)", "Nieko daryti nebereikia.", "Mėnuo uždarytas."],
            NotificationTexts.DigestDetails("lt", notification));
    }

    [Theory]
    [InlineData(NotificationType.MonthReadyToClose, "lt", "2026 m. rugpjūtis")]
    [InlineData(NotificationType.MonthlyDigest, "en", "August 2026")]
    [InlineData(NotificationType.BudgetExceeded, "lt", "Groceries")]
    public void The_title_of_a_month_is_rendered_in_the_recipients_language(NotificationType type, string language, string expected)
    {
        var notification = Sample(type);
        notification.Title = "Groceries";

        Assert.Equal(expected, NotificationTexts.Title(language, notification));
    }

    [Fact]
    public void An_unusual_amount_reads_with_its_factor_and_currency()
    {
        var notification = Sample(NotificationType.UnusualAmount);

        Assert.Equal("126.00 EUR: 3× the usual 41.50 EUR", NotificationTexts.Sentence("en", notification));
        Assert.Equal("/transactions?unusual=true", NotificationTexts.PagePath(NotificationType.UnusualAmount));
    }
}
