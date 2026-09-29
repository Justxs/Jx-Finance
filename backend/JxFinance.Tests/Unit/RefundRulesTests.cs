using FluentValidation;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Common.Validation;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Dashboard.Shared;

namespace JxFinance.Tests.Unit;

public sealed class RefundRulesTests
{
    [Theory]
    [InlineData("12.50", true)]
    [InlineData("-12.50", true)]
    [InlineData("0", false)]
    [InlineData("0.001", false)]
    [InlineData("-10000000000000000.00", false)]
    public void Non_zero_money_takes_either_sign_and_refuses_zero(string amount, bool valid)
    {
        var validator = new InlineValidator<decimal>();
        validator.RuleFor(value => value).IsNonZeroMoney();

        var result = validator.Validate(decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture));

        Assert.Equal(valid, result.IsValid);
        Assert.All(result.Errors, error => Assert.Equal("money.nonZero", error.ErrorCode));
    }

    [Fact]
    public void A_category_below_zero_keeps_its_net_and_sorts_last()
    {
        var food = new Category { Name = "Food", Type = FlowType.Expense };
        var shoes = new Category { Name = "Shoes", Type = FlowType.Expense };
        var day = new DateOnly(2026, 4, 3);

        var items = CategoryBreakdownBuilder.Build(
            [new CategoryAttribution(day, shoes.Id, 30m), new CategoryAttribution(day, shoes.Id, -45m), new CategoryAttribution(day, food.Id, 12m)],
            new Dictionary<CategoryId, Category> { [food.Id] = food, [shoes.Id] = shoes },
            [],
            FlowType.Expense);

        Assert.Equal([("Food", 12m), ("Shoes", -15m)], items.Select(item => (item.CategoryName, item.Amount)));
    }
}
