using System.Net;
using System.Net.Http.Json;
using JxFinance.Tests.Support;

namespace JxFinance.Tests.Integration.NetWorth;

[Collection<IntegrationCollection>]
public sealed class DebtScheduleEndpointTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    [Fact]
    public async Task A_thirty_year_mortgage_has_the_known_level_payment_and_split()
    {
        using var member = await CreateUserClientAsync();
        var debt = await CreateDebtAsync(member, new { loanAmount = "100000.00", interestRate = 5m, firstPaymentDate = "2026-01-01", termMonths = 360 });

        var schedule = await member.GetFromJsonAsync<ScheduleDto>($"/api/debts/{debt.Id}/schedule", TestContext.Current.CancellationToken);

        Assert.Equal(("100000.00", 5m, "annuity", "536.82"), (schedule!.LoanAmount, schedule.InterestRate, schedule.AmortizationType, schedule.RegularPayment));
        Assert.Equal(360, schedule.Plan.Payments);
        Assert.Equal(360, schedule.Plan.Rows.Count);
        Assert.Equal(new RowDto(1, new DateOnly(2026, 1, 1), "536.82", "416.67", "120.15", "0.00", "99879.85"), schedule.Plan.Rows[0]);
        Assert.Equal(new DateOnly(2055, 12, 1), schedule.Plan.PayoffDate);
        Assert.Equal("0.00", schedule.Plan.Rows[^1].Balance);
        Assert.Equal(schedule.Plan.PayoffDate, debt.PayoffDate);
        Assert.Null(schedule.WithExtra);
        Assert.Null(schedule.InterestSaved);
        Assert.Equal(
            decimal.Parse(schedule.Plan.TotalPaid, System.Globalization.CultureInfo.InvariantCulture) - 100000m,
            decimal.Parse(schedule.Plan.TotalInterest, System.Globalization.CultureInfo.InvariantCulture));
    }

    [Fact]
    public async Task A_fixed_payment_derives_the_term_and_the_list_shows_the_payoff_date()
    {
        using var member = await CreateUserClientAsync();
        var debt = await CreateDebtAsync(member, new { loanAmount = "10000.00", interestRate = 0m, firstPaymentDate = "2026-01-10", monthlyPayment = "1000.00" });

        var schedule = await member.GetFromJsonAsync<ScheduleDto>($"/api/debts/{debt.Id}/schedule", TestContext.Current.CancellationToken);

        Assert.Equal((10, "1000.00", "0.00"), (schedule!.Plan.Payments, schedule.RegularPayment, schedule.Plan.TotalInterest));
        Assert.Equal(new DateOnly(2026, 10, 10), debt.PayoffDate);
    }

    [Fact]
    public async Task A_linear_debt_repays_equal_principal()
    {
        using var member = await CreateUserClientAsync();
        var debt = await CreateDebtAsync(member, new { loanAmount = "1200.00", interestRate = 12m, firstPaymentDate = "2026-01-01", termMonths = 12, amortizationType = "linear" });

        var schedule = await member.GetFromJsonAsync<ScheduleDto>($"/api/debts/{debt.Id}/schedule", TestContext.Current.CancellationToken);

        Assert.All(schedule!.Plan.Rows, row => Assert.Equal("100.00", row.Principal));
        Assert.Equal(("112.00", "78.00"), (schedule.RegularPayment, schedule.Plan.TotalInterest));
    }

    [Fact]
    public async Task Paying_extra_every_month_answers_the_faster_plan_and_what_it_saves()
    {
        using var member = await CreateUserClientAsync();
        var debt = await CreateDebtAsync(member, new { loanAmount = "100000.00", interestRate = 5m, firstPaymentDate = "2026-01-01", termMonths = 360 });

        var schedule = await member.GetFromJsonAsync<ScheduleDto>($"/api/debts/{debt.Id}/schedule?extraMonthly=100.00", TestContext.Current.CancellationToken);

        Assert.NotNull(schedule!.WithExtra);
        Assert.Equal(256, schedule.WithExtra.Payments);
        Assert.Equal(104, schedule.PaymentsSaved);
        Assert.Equal("100.00", schedule.WithExtra.Rows[0].Extra);
        Assert.Equal(
            decimal.Parse(schedule.Plan.TotalInterest, System.Globalization.CultureInfo.InvariantCulture)
                - decimal.Parse(schedule.WithExtra.TotalInterest, System.Globalization.CultureInfo.InvariantCulture),
            decimal.Parse(schedule.InterestSaved!, System.Globalization.CultureInfo.InvariantCulture));
    }

    [Fact]
    public async Task A_lump_sum_is_paid_with_the_first_payment_on_or_after_its_date()
    {
        using var member = await CreateUserClientAsync();
        var debt = await CreateDebtAsync(member, new { loanAmount = "10000.00", interestRate = 0m, firstPaymentDate = "2026-01-15", termMonths = 10 });

        var schedule = await member.GetFromJsonAsync<ScheduleDto>($"/api/debts/{debt.Id}/schedule?lumpSum=5000&lumpSumDate=2026-03-02", TestContext.Current.CancellationToken);

        var paid = Assert.Single(schedule!.WithExtra!.Rows, row => row.Extra != "0.00");
        Assert.Equal((3, "5000.00"), (paid.Number, paid.Extra));
        Assert.Equal(5, schedule.WithExtra.Payments);
    }

    [Fact]
    public async Task The_scheduled_balance_counts_the_payments_already_due()
    {
        using var member = await CreateUserClientAsync();
        var debt = await CreateDebtAsync(member, new { loanAmount = "2400.00", interestRate = 0m, firstPaymentDate = Today.AddMonths(-2), termMonths = 24 });

        var schedule = await member.GetFromJsonAsync<ScheduleDto>($"/api/debts/{debt.Id}/schedule", TestContext.Current.CancellationToken);

        Assert.Equal((Today, 3, "2100.00"), (schedule!.AsOf, schedule.PaymentsMade, schedule.ScheduledBalance));
    }

    [Theory]
    [InlineData("""{ "loanAmount": "100000.00", "interestRate": 6, "firstPaymentDate": "2026-01-01", "monthlyPayment": "500.00" }""", "monthlyPayment", "debt.paymentTooSmall")]
    [InlineData("""{ "loanAmount": "100000.00", "interestRate": 6, "firstPaymentDate": "2026-01-01", "monthlyPayment": "500.01" }""", "monthlyPayment", "debt.paymentTooSmall")]
    [InlineData("""{ "loanAmount": "1000.00", "termMonths": 12, "monthlyPayment": "100.00" }""", "monthlyPayment", "value.mustBeEmpty")]
    [InlineData("""{ "loanAmount": "1000.00", "monthlyPayment": "100.00", "amortizationType": "linear" }""", "monthlyPayment", "value.mustBeEmpty")]
    [InlineData("""{ "termMonths": 601 }""", "termMonths", "range.invalid")]
    [InlineData("""{ "termMonths": 0 }""", "termMonths", "range.invalid")]
    [InlineData("""{ "loanAmount": "0.00" }""", "loanAmount", "money.positive")]
    [InlineData("""{ "monthlyPayment": "-5.00" }""", "monthlyPayment", "money.positive")]
    public async Task Invalid_schedule_fields_are_refused_with_a_published_code(string fields, string field, string code)
    {
        using var member = await CreateUserClientAsync();
        var body = System.Text.Json.Nodes.JsonNode.Parse(fields)!.AsObject();
        body["name"] = "Loan";
        body["type"] = "loan";
        body["outstandingAmount"] = "1000.00";
        body["asOf"] = Today.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);

        var response = await member.PostAsJsonAsync("/api/debts", body, TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, field);
        await AssertProblemAsync(response, HttpStatusCode.BadRequest, code);
    }

    [Fact]
    public async Task A_debt_without_enough_terms_has_no_schedule()
    {
        using var member = await CreateUserClientAsync();
        var debt = await CreateDebtAsync(member, new { loanAmount = "1000.00", interestRate = 5m });

        var response = await member.GetAsync($"/api/debts/{debt.Id}/schedule", TestContext.Current.CancellationToken);

        Assert.Null(debt.PayoffDate);
        await AssertProblemAsync(response, HttpStatusCode.BadRequest, "debt.scheduleIncomplete");
    }

    [Theory]
    [InlineData("extraMonthly=-1", "extraMonthly")]
    [InlineData("extraMonthly=abc", "extraMonthly")]
    [InlineData("extraMonthly=1.234", "extraMonthly")]
    [InlineData("lumpSum=100", "lumpSumDate")]
    public async Task Invalid_overpayments_are_refused(string query, string field)
    {
        using var member = await CreateUserClientAsync();
        var debt = await CreateDebtAsync(member, new { loanAmount = "1000.00", interestRate = 5m, firstPaymentDate = "2026-01-01", termMonths = 12 });

        var response = await member.GetAsync($"/api/debts/{debt.Id}/schedule?{query}", TestContext.Current.CancellationToken);

        await AssertValidationErrorAsync(response, field);
    }

    [Fact]
    public async Task The_schedule_of_another_persons_debt_is_not_found()
    {
        using var pair = await CreateHouseholdPairAsync();
        var (_, _, ownerClient, partnerClient, _) = pair;
        var debt = await CreateDebtAsync(ownerClient, new { loanAmount = "1000.00", interestRate = 5m, firstPaymentDate = "2026-01-01", termMonths = 12 });

        var partnerResponse = await partnerClient.GetAsync($"/api/debts/{debt.Id}/schedule", TestContext.Current.CancellationToken);
        var unknown = await ownerClient.GetAsync($"/api/debts/{Guid.NewGuid()}/schedule", TestContext.Current.CancellationToken);

        await AssertProblemAsync(partnerResponse, HttpStatusCode.NotFound, "resource.notFound");
        await AssertProblemAsync(unknown, HttpStatusCode.NotFound, "resource.notFound");
        Assert.Equal(HttpStatusCode.OK, (await ownerClient.GetAsync($"/api/debts/{debt.Id}/schedule", TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task Clearing_the_schedule_fields_on_update_takes_the_schedule_away()
    {
        using var member = await CreateUserClientAsync();
        var debt = await CreateDebtAsync(member, new { loanAmount = "1000.00", interestRate = 5m, firstPaymentDate = "2026-01-01", termMonths = 12 });

        var update = await member.PutAsJsonAsync(
            $"/api/debts/{debt.Id}",
            new { name = "Loan", type = "loan", outstandingAmount = "900.00", interestRate = 5m, asOf = Today }, TestContext.Current.CancellationToken);

        update.EnsureSuccessStatusCode();
        var updated = await update.Content.ReadFromJsonAsync<DebtDto>(TestContext.Current.CancellationToken);
        Assert.Equal((null, null, "annuity"), (updated!.PayoffDate, updated.LoanAmount, updated.AmortizationType));
        await AssertProblemAsync(await member.GetAsync($"/api/debts/{debt.Id}/schedule", TestContext.Current.CancellationToken), HttpStatusCode.BadRequest, "debt.scheduleIncomplete");
    }

    private async Task<DebtDto> CreateDebtAsync(HttpClient client, object schedule)
    {
        var body = System.Text.Json.JsonSerializer.SerializeToNode(schedule, System.Text.Json.JsonSerializerOptions.Web)!.AsObject();
        body["name"] = "Loan";
        body["type"] = "loan";
        body["outstandingAmount"] = "1000.00";
        body["asOf"] = Today.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        return await PostAsync<DebtDto>(client, "/api/debts", body);
    }

    private sealed record DebtDto(Guid Id, string? LoanAmount, string AmortizationType, DateOnly? PayoffDate);

    private sealed record ScheduleDto(
        DateOnly AsOf,
        string LoanAmount,
        decimal InterestRate,
        string AmortizationType,
        string RegularPayment,
        string ScheduledBalance,
        int PaymentsMade,
        PlanDto Plan,
        PlanDto? WithExtra,
        string? InterestSaved,
        int? PaymentsSaved);

    private sealed record PlanDto(DateOnly PayoffDate, int Payments, string TotalPaid, string TotalInterest, string TotalExtra, List<RowDto> Rows);

    private sealed record RowDto(int Number, DateOnly Date, string Payment, string Interest, string Principal, string Extra, string Balance);
}
