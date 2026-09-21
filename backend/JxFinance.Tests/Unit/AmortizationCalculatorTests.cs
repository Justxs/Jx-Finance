using JxFinance.Common.Amortization;
using JxFinance.Common.Errors;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Tests.Unit;

public sealed class AmortizationCalculatorTests
{
    private static readonly DateOnly First = new(2026, 1, 15);

    [Theory]
    [InlineData(100000, 5, 360, 536.82)]
    [InlineData(200000, 6, 360, 1199.10)]
    [InlineData(10000, 7, 60, 198.01)]
    [InlineData(150000, 4.5, 180, 1147.49)]
    [InlineData(1200, 0, 12, 100.00)]
    [InlineData(1000, 12, 1, 1010.00)]
    public void Level_payment_matches_the_known_annuity_values(decimal principal, decimal rate, int term, decimal expected) =>
        Assert.Equal(expected, AmortizationCalculator.LevelPayment(principal, rate, term));

    [Fact]
    public void A_thirty_year_mortgage_splits_each_payment_and_repays_exactly_the_principal()
    {
        var schedule = Schedule(new AmortizationTerms(100000m, 5m, First, 360, null));

        Assert.Equal(360, schedule.Rows.Count);
        Assert.Equal(536.82m, schedule.RegularPayment);
        Assert.Equal(new AmortizationRow(1, First, 536.82m, 416.67m, 120.15m, 0m, 99879.85m), schedule.Rows[0]);
        Assert.Equal(new AmortizationRow(2, First.AddMonths(1), 536.82m, 416.17m, 120.65m, 0m, 99759.20m), schedule.Rows[1]);
        Assert.All(schedule.Rows.SkipLast(1), row => Assert.Equal(536.82m, row.Payment));
        Assert.All(schedule.Rows, row => Assert.Equal(row.Payment, row.Interest + row.Principal));
        Assert.Equal(100000m, schedule.Rows.Sum(row => row.Principal));
        Assert.Equal(0m, schedule.Rows[^1].Balance);
        Assert.Equal(538.14m, schedule.Rows[^1].Payment);
        Assert.Equal(new DateOnly(2055, 12, 15), schedule.PayoffDate);
        Assert.Equal(schedule.TotalPaid - 100000m, schedule.TotalInterest);
        Assert.InRange(schedule.TotalInterest, 93250m, 93260m);
    }

    [Fact]
    public void Every_amount_is_in_whole_cents()
    {
        var schedule = Schedule(new AmortizationTerms(123456.78m, 3.37m, First, 247, null));

        Assert.All(schedule.Rows, row =>
        {
            Assert.Equal(decimal.Round(row.Interest, 2), row.Interest);
            Assert.Equal(decimal.Round(row.Principal, 2), row.Principal);
            Assert.Equal(decimal.Round(row.Balance, 2), row.Balance);
        });
        Assert.Equal(123456.78m, schedule.Rows.Sum(row => row.Principal));
    }

    [Fact]
    public void A_zero_rate_divides_the_principal_and_the_last_payment_absorbs_the_remainder()
    {
        var schedule = Schedule(new AmortizationTerms(1000m, 0m, First, 3, null));

        Assert.Equal([333.33m, 333.33m, 333.34m], schedule.Rows.Select(row => row.Payment));
        Assert.All(schedule.Rows, row => Assert.Equal(0m, row.Interest));
        Assert.Equal(0m, schedule.TotalInterest);
        Assert.Equal(1000m, schedule.TotalPaid);
    }

    [Fact]
    public void A_single_payment_repays_the_principal_with_one_month_of_interest()
    {
        var schedule = Schedule(new AmortizationTerms(1000m, 12m, First, 1, null));

        Assert.Equal(new AmortizationRow(1, First, 1010m, 10m, 1000m, 0m, 0m), Assert.Single(schedule.Rows));
    }

    [Fact]
    public void A_fixed_payment_derives_the_term_and_a_rounded_down_payment_leaves_a_small_last_one()
    {
        var schedule = Schedule(new AmortizationTerms(100000m, 5m, First, null, 536.82m));

        Assert.Equal(361, schedule.Rows.Count);
        Assert.Equal(536.82m, schedule.RegularPayment);
        Assert.Equal(1.33m, schedule.Rows[^1].Payment);
        Assert.Equal(0m, schedule.Rows[^1].Balance);
    }

    [Fact]
    public void A_fixed_payment_rounded_up_repays_within_the_term()
    {
        var schedule = Schedule(new AmortizationTerms(100000m, 5m, First, null, 536.83m));

        Assert.Equal(360, schedule.Rows.Count);
        Assert.True(schedule.Rows[^1].Payment < 536.83m);
    }

    [Fact]
    public void A_fixed_payment_at_zero_rate_ends_with_a_smaller_last_payment()
    {
        var schedule = Schedule(new AmortizationTerms(1050m, 0m, First, null, 100m));

        Assert.Equal(11, schedule.Rows.Count);
        Assert.Equal(50m, schedule.Rows[^1].Payment);
    }

    [Fact]
    public void A_payment_larger_than_the_debt_repays_it_at_once()
    {
        var schedule = Schedule(new AmortizationTerms(500m, 12m, First, null, 1000m));

        Assert.Equal(new AmortizationRow(1, First, 505m, 5m, 500m, 0m, 0m), Assert.Single(schedule.Rows));
    }

    [Theory]
    [InlineData(100000, 6, 500.00)]
    [InlineData(100000, 6, 499.99)]
    [InlineData(100000, 6, 500.01)]
    [InlineData(100000, 5, 420.00)]
    public void A_payment_that_does_not_repay_within_fifty_years_is_refused(decimal principal, decimal rate, decimal payment)
    {
        var result = AmortizationCalculator.Calculate(new AmortizationTerms(principal, rate, First, null, payment));

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorCodes.DebtPaymentTooSmall, result.ErrorCode);
    }

    [Fact]
    public void A_payment_just_large_enough_for_fifty_years_is_accepted()
    {
        var payment = AmortizationCalculator.LevelPayment(100000m, 5m, 600);

        var schedule = Schedule(new AmortizationTerms(100000m, 5m, First, null, payment));

        Assert.InRange(schedule.Rows.Count, 599, 600);
    }

    [Fact]
    public void A_linear_schedule_repays_equal_principal_with_falling_interest()
    {
        var schedule = Schedule(new AmortizationTerms(1200m, 12m, First, 12, null, AmortizationType.Linear));

        Assert.Equal(12, schedule.Rows.Count);
        Assert.All(schedule.Rows, row => Assert.Equal(100m, row.Principal));
        Assert.Equal(112m, schedule.Rows[0].Payment);
        Assert.Equal(101m, schedule.Rows[^1].Payment);
        Assert.Equal(78m, schedule.TotalInterest);
        Assert.Equal(112m, schedule.RegularPayment);
    }

    [Fact]
    public void A_linear_schedule_puts_the_rounding_into_the_last_principal()
    {
        var schedule = Schedule(new AmortizationTerms(1000m, 0m, First, 3, null, AmortizationType.Linear));

        Assert.Equal([333.33m, 333.33m, 333.34m], schedule.Rows.Select(row => row.Principal));
    }

    [Fact]
    public void Paying_extra_every_month_shortens_the_term_and_saves_interest()
    {
        var terms = new AmortizationTerms(100000m, 5m, First, 360, null);
        var plain = Schedule(terms);

        var faster = Schedule(terms, new ExtraPayments(100m));

        Assert.True(faster.Rows.Count < plain.Rows.Count);
        Assert.True(faster.TotalInterest < plain.TotalInterest);
        Assert.Equal(536.82m, faster.RegularPayment);
        Assert.All(faster.Rows.SkipLast(1), row => Assert.Equal(100m, row.Extra));
        Assert.Equal(100000m, faster.Rows.Sum(row => row.Principal + row.Extra));
        Assert.Equal(0m, faster.Rows[^1].Balance);
        Assert.Equal(faster.TotalPaid - 100000m, faster.TotalInterest);
        Assert.Equal(256, faster.Rows.Count);
    }

    [Fact]
    public void An_extra_payment_never_overpays_the_last_balance()
    {
        var schedule = Schedule(new AmortizationTerms(1000m, 0m, First, 10, null), new ExtraPayments(450m));

        Assert.Equal([450m, 350m], schedule.Rows.Select(row => row.Extra));
        Assert.Equal([100m, 100m], schedule.Rows.Select(row => row.Principal));
        Assert.Equal(0m, schedule.Rows[^1].Balance);
    }

    [Theory]
    [InlineData("2026-03-15", 3)]
    [InlineData("2026-03-01", 3)]
    [InlineData("2026-03-16", 4)]
    [InlineData("2025-06-01", 1)]
    public void A_lump_sum_is_paid_with_the_first_payment_on_or_after_its_date(string date, int expectedNumber)
    {
        var schedule = Schedule(
            new AmortizationTerms(10000m, 0m, First, 10, null),
            new ExtraPayments(LumpSum: 5000m, LumpSumDate: DateOnly.Parse(date, System.Globalization.CultureInfo.InvariantCulture)));

        var withLumpSum = Assert.Single(schedule.Rows, row => row.Extra > 0);
        Assert.Equal((expectedNumber, 5000m), (withLumpSum.Number, withLumpSum.Extra));
        Assert.Equal(5, schedule.Rows.Count);
    }

    [Fact]
    public void A_lump_sum_after_the_payoff_changes_nothing()
    {
        var terms = new AmortizationTerms(1000m, 0m, First, 2, null);

        var schedule = Schedule(terms, new ExtraPayments(LumpSum: 5000m, LumpSumDate: new DateOnly(2030, 1, 1)));

        Assert.Equal(Schedule(terms).Rows, schedule.Rows);
    }

    [Fact]
    public void Payment_dates_keep_the_day_of_the_first_payment_after_a_short_month()
    {
        var schedule = Schedule(new AmortizationTerms(400m, 0m, new DateOnly(2026, 1, 31), 4, null));

        Assert.Equal(
            [new DateOnly(2026, 1, 31), new DateOnly(2026, 2, 28), new DateOnly(2026, 3, 31), new DateOnly(2026, 4, 30)],
            schedule.Rows.Select(row => row.Date));
    }

    [Fact]
    public void The_scheduled_balance_is_the_balance_after_the_last_payment_made()
    {
        var schedule = Schedule(new AmortizationTerms(1200m, 0m, First, 12, null));

        Assert.Equal((1200m, 0), (schedule.BalanceOn(First.AddDays(-1)), schedule.PaymentsMadeBy(First.AddDays(-1))));
        Assert.Equal((1100m, 1), (schedule.BalanceOn(First), schedule.PaymentsMadeBy(First)));
        Assert.Equal((900m, 3), (schedule.BalanceOn(new DateOnly(2026, 4, 14)), schedule.PaymentsMadeBy(new DateOnly(2026, 4, 14))));
        Assert.Equal((0m, 12), (schedule.BalanceOn(new DateOnly(2040, 1, 1)), schedule.PaymentsMadeBy(new DateOnly(2040, 1, 1))));
    }

    [Fact]
    public void The_highest_rate_over_the_longest_term_does_not_overflow()
    {
        var schedule = Schedule(new AmortizationTerms(9999999999999999.99m, 100m, First, 600, null));

        Assert.Equal(600, schedule.Rows.Count);
        Assert.Equal(0m, schedule.Rows[^1].Balance);
    }

    [Theory]
    [InlineData(0, 5, 12, null)]
    [InlineData(1000, -1, 12, null)]
    [InlineData(1000, 5, 0, null)]
    [InlineData(1000, 5, 601, null)]
    [InlineData(1000, 5, null, null)]
    [InlineData(1000, 5, null, 0)]
    public void Invalid_terms_are_a_programming_error(decimal principal, decimal rate, int? term, int? payment) =>
        Assert.ThrowsAny<ArgumentException>(() => AmortizationCalculator.Calculate(new AmortizationTerms(principal, rate, First, term, payment)));

    [Fact]
    public void A_linear_schedule_without_a_term_is_a_programming_error() =>
        Assert.Throws<ArgumentException>(() =>
            AmortizationCalculator.Calculate(new AmortizationTerms(1000m, 5m, First, null, 100m, AmortizationType.Linear)));

    [Fact]
    public void A_lump_sum_without_a_date_is_a_programming_error() =>
        Assert.Throws<ArgumentException>(() =>
            AmortizationCalculator.Calculate(new AmortizationTerms(1000m, 5m, First, 12, null), new ExtraPayments(LumpSum: 10m)));

    [Fact]
    public void Terms_are_read_from_a_debt_only_when_enough_is_set()
    {
        var debt = new Debt { Name = "Loan", LoanAmount = new(1000m), InterestRate = 5m, FirstPaymentDate = First, TermMonths = 12 };

        Assert.Equal(new AmortizationTerms(1000m, 5m, First, 12, null), AmortizationTerms.From(debt));
        Assert.Null(AmortizationTerms.From(new Debt { Name = "Loan", LoanAmount = new(1000m), InterestRate = 5m, FirstPaymentDate = First }));
        Assert.Null(AmortizationTerms.From(new Debt { Name = "Loan", LoanAmount = new(1000m), FirstPaymentDate = First, TermMonths = 12 }));
        Assert.Null(AmortizationTerms.From(new Debt
        {
            Name = "Loan",
            LoanAmount = new(1000m),
            InterestRate = 5m,
            FirstPaymentDate = First,
            MonthlyPayment = new(100m),
            AmortizationType = AmortizationType.Linear,
        }));
    }

    private static AmortizationSchedule Schedule(AmortizationTerms terms, ExtraPayments? extra = null)
    {
        var result = AmortizationCalculator.Calculate(terms, extra ?? ExtraPayments.None);
        Assert.True(result.IsSuccess, result.ErrorMessage);
        return result.Value!;
    }
}
