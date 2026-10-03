using JxFinance.Common.Errors;
using JxFinance.Endpoints.Goals.UpdateGoalProgress;

namespace JxFinance.Tests.Unit;

public sealed class UpdateGoalProgressValidatorTests
{
    private readonly UpdateGoalProgressValidator validator = new();

    [Theory]
    [InlineData("0.00", null)]
    [InlineData("12000.50", null)]
    [InlineData(null, "50.00")]
    [InlineData(null, "-20.00")]
    public void A_new_amount_or_a_delta_alone_is_accepted(string? currentAmount, string? delta)
    {
        Assert.True(validator.Validate(Request(currentAmount, delta)).IsValid);
    }

    [Theory]
    [InlineData("-0.01", null, nameof(UpdateGoalProgressRequest.CurrentAmount), ErrorCodes.MoneyNonNegative)]
    [InlineData("1.005", null, nameof(UpdateGoalProgressRequest.CurrentAmount), ErrorCodes.MoneyNonNegative)]
    [InlineData(null, "1.005", nameof(UpdateGoalProgressRequest.Delta), ErrorCodes.MoneyInvalid)]
    [InlineData(null, null, nameof(UpdateGoalProgressRequest.CurrentAmount), ErrorCodes.Required)]
    [InlineData("10.00", "5.00", nameof(UpdateGoalProgressRequest.Delta), ErrorCodes.ValueMustBeEmpty)]
    public void A_bad_amount_or_neither_or_both_fields_are_refused(string? currentAmount, string? delta, string field, string code)
    {
        var error = Assert.Single(validator.Validate(Request(currentAmount, delta)).Errors);

        Assert.Equal(field, error.PropertyName, ignoreCase: true);
        Assert.Equal(code, error.ErrorCode);
    }

    private static UpdateGoalProgressRequest Request(string? currentAmount, string? delta) =>
        new(Guid.NewGuid(), Parse(currentAmount), Parse(delta));

    private static decimal? Parse(string? value) =>
        value is null ? null : decimal.Parse(value, System.Globalization.CultureInfo.InvariantCulture);
}
