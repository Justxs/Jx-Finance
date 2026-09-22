using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Sharing;
using JxFinance.Domain.Common;

namespace JxFinance.Tests.Unit;

public sealed class SharingRulesTests
{
    [Fact]
    public void A_shared_input_without_a_household_is_refused()
    {
        var result = new InputValidator().Validate(new Input(Scope.Shared, null));

        var error = Assert.Single(result.Errors);
        Assert.Equal(nameof(Input.HouseholdId), error.PropertyName);
        Assert.Equal(ErrorCodes.HouseholdRequired, error.ErrorCode);
        Assert.Equal("A shared widget needs a household.", error.ErrorMessage);
    }

    [Theory]
    [InlineData(Scope.Shared, true)]
    [InlineData(Scope.Personal, false)]
    [InlineData(Scope.Personal, true)]
    public void Personal_inputs_and_shared_inputs_with_a_household_are_accepted(Scope scope, bool hasHousehold)
    {
        var result = new InputValidator().Validate(new Input(scope, hasHousehold ? Guid.NewGuid() : null));

        Assert.True(result.IsValid);
    }

    private sealed record Input(Scope Scope, Guid? HouseholdId) : IShareableInput;

    private sealed class InputValidator : AbstractValidator<Input>
    {
        public InputValidator() => RuleFor(r => r.HouseholdId).RequiresHouseholdWhenShared("widget");
    }
}
