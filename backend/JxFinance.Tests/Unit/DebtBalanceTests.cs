using JxFinance.Common.Amortization;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Tests.Unit;

public sealed class DebtBalanceTests
{
    private static readonly DateOnly Anchor = new(2026, 1, 1);

    [Fact]
    public void A_regular_payment_pays_a_month_of_interest_first_and_an_extra_one_in_the_same_month_is_all_principal()
    {
        var track = DebtBalance.Track(10000m, Anchor, 6m, [Paid("2026-01-20", 1000m, DebtPaymentKind.Extra), Paid("2026-01-15", 500m)]);

        Assert.Equal(
            [(50m, 450m, 9550m), (0m, 1000m, 8550m)],
            track.Rows.Select(r => (r.Interest, r.Principal, r.Balance)));
        Assert.Equal(8550m, track.Balance);
    }

    [Fact]
    public void A_typed_principal_wins_over_the_calculation()
    {
        var row = Assert.Single(DebtBalance.Track(10000m, Anchor, 6m, [Paid("2026-02-01", 500m, principal: 480m)]).Rows);

        Assert.Equal((20m, 480m, 9520m), (row.Interest, row.Principal, row.Balance));
    }

    [Fact]
    public void A_typed_principal_never_pays_more_than_the_payment()
    {
        var row = Assert.Single(DebtBalance.Track(10000m, Anchor, 6m, [Paid("2026-02-01", 500m, principal: 900m)]).Rows);

        Assert.Equal((0m, 500m, 9500m), (row.Interest, row.Principal, row.Balance));
    }

    [Theory]
    [InlineData(0.0)]
    [InlineData(null)]
    public void Without_a_rate_everything_is_principal(double? rate)
    {
        var track = DebtBalance.Track(1000m, Anchor, (decimal?)rate, [Paid("2026-02-01", 300m)]);

        Assert.Equal((0m, 300m), (track.Rows[0].Interest, track.Rows[0].Principal));
        Assert.Equal(700m, track.Balance);
    }

    [Fact]
    public void Payments_beyond_payoff_show_the_excess_as_overpaid()
    {
        var track = DebtBalance.Track(600m, Anchor, 0m, [Paid("2026-02-01", 500m), Paid("2026-03-01", 500m), Paid("2026-04-01", 500m)]);

        Assert.Equal(
            [(500m, 0m, 100m), (100m, 400m, 0m), (0m, 500m, 0m)],
            track.Rows.Select(r => (r.Principal, r.Overpaid, r.Balance)));
        Assert.Equal(0m, track.Balance);
    }

    [Fact]
    public void Payments_on_or_before_the_anchor_are_ignored_and_ties_keep_their_order()
    {
        var first = Paid("2026-02-01", 100m);
        var second = Paid("2026-02-01", 200m, DebtPaymentKind.Extra);

        var track = DebtBalance.Track(1000m, Anchor, 0m, [Paid("2025-12-31", 50m), Paid("2026-01-01", 50m), first, second]);

        Assert.Equal([first, second], track.Rows.Select(r => r.Payment));
        Assert.Equal(700m, track.Balance);
    }

    [Fact]
    public void Interest_is_rounded_to_cents()
    {
        var row = Assert.Single(DebtBalance.Track(1000m, Anchor, 3.33m, [Paid("2026-02-01", 100m)]).Rows);

        Assert.Equal((2.78m, 97.22m, 902.78m), (row.Interest, row.Principal, row.Balance));
    }

    private static TrackedPayment Paid(string date, decimal amount, DebtPaymentKind kind = DebtPaymentKind.Regular, decimal? principal = null) =>
        new(Guid.NewGuid(), DateOnly.Parse(date, System.Globalization.CultureInfo.InvariantCulture), amount, kind, principal);
}
