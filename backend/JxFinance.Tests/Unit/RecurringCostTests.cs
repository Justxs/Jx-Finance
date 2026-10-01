using System.Globalization;
using JxFinance.Common.RecurringBills;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Tests.Unit;

public sealed class RecurringCostTests
{
    [Theory]
    [InlineData(RecurringBillCadence.Weekly, "520.00")]
    [InlineData(RecurringBillCadence.Monthly, "120.00")]
    [InlineData(RecurringBillCadence.Quarterly, "40.00")]
    [InlineData(RecurringBillCadence.Yearly, "10.00")]
    public void Each_cadence_is_counted_as_often_as_it_falls_in_a_year(RecurringBillCadence cadence, string perYear)
    {
        Assert.Equal(decimal.Parse(perYear, CultureInfo.InvariantCulture), RecurringCost.PerYear(10.00m, cadence));
    }

    [Fact]
    public void A_month_is_a_twelfth_of_the_year()
    {
        var yearly = RecurringCost.PerYear(286.40m, RecurringBillCadence.Yearly) + RecurringCost.PerYear(9.99m, RecurringBillCadence.Weekly);

        Assert.Equal(805.88m, yearly);
        Assert.Equal(67.16m, Money.Round(yearly / RecurringCost.MonthsPerYear));
    }
}
