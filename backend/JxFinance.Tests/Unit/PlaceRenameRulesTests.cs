using JxFinance.Common.Errors;
using JxFinance.Common.Places;
using JxFinance.Endpoints.Transactions.RenamePlace;

namespace JxFinance.Tests.Unit;

public sealed class PlaceRenameRulesTests
{
    [Fact]
    public void Every_stored_spelling_of_a_listed_place_is_renamed_except_the_new_name_itself()
    {
        string[] stored = ["Maxima Ozo", "maxima ozo", "MAXIMA OZO", "Maxima, Ozo g. 18", "Maxima Ozas", "Rimi"];

        var renamed = PlaceSpellings.Renamed(stored, [" maxima ozo ", "Maxima, Ozo g. 18", "Maxima Ozas"], "Maxima Ozas");

        Assert.Equal(["Maxima Ozo", "maxima ozo", "MAXIMA OZO", "Maxima, Ozo g. 18"], renamed);
    }

    [Theory]
    [InlineData(" Maxima, Ozo g. 18 ", "maxima, ozo g. 18")]
    [InlineData("IKI ŽIRMŪNAI", "iki žirmūnai")]
    public void A_place_key_ignores_case_and_surrounding_spaces(string place, string key)
    {
        Assert.Equal(key, PlaceSpellings.KeyOf(place));
    }

    [Theory]
    [InlineData("", ErrorCodes.Required)]
    [InlineData("  ", ErrorCodes.Required)]
    [InlineData("121", ErrorCodes.TextTooLong)]
    public void An_empty_or_too_long_name_uses_the_text_codes(string name, string code)
    {
        var request = new RenamePlaceRequest(["Maxima"], name == "121" ? new string('x', 121) : name);

        var error = Assert.Single(new RenamePlaceValidator().Validate(request).Errors);

        Assert.Equal(nameof(RenamePlaceRequest.Name), error.PropertyName, ignoreCase: true);
        Assert.Equal(code, error.ErrorCode);
    }

    [Fact]
    public void Merging_takes_between_one_and_fifty_places_that_are_not_empty()
    {
        var validator = new RenamePlaceValidator();

        Assert.Equal(ErrorCodes.Required, Assert.Single(validator.Validate(new RenamePlaceRequest([], "Maxima")).Errors).ErrorCode);
        Assert.Equal(ErrorCodes.Required, Assert.Single(validator.Validate(new RenamePlaceRequest([" "], "Maxima")).Errors).ErrorCode);
        Assert.Equal(
            ErrorCodes.CollectionInvalidSize,
            Assert.Single(validator.Validate(new RenamePlaceRequest([.. Enumerable.Range(0, 51).Select(i => $"Shop {i}")], "Maxima")).Errors).ErrorCode);
        Assert.True(validator.Validate(new RenamePlaceRequest([.. Enumerable.Range(0, 50).Select(i => $"Shop {i}")], "Maxima")).IsValid);
    }
}
