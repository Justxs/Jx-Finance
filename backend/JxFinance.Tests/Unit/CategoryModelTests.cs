using JxFinance.Common.LearnedCategories;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;

namespace JxFinance.Tests.Unit;

public sealed class CategoryModelTests
{
    private static readonly AccountId Current = new(Guid.Parse("00000000-0000-4000-8000-00000000000a"));
    private static readonly AccountId Card = new(Guid.Parse("00000000-0000-4000-8000-00000000000b"));
    private static readonly CategoryId Groceries = new(Guid.Parse("00000000-0000-4000-8000-000000000001"));
    private static readonly CategoryId Fuel = new(Guid.Parse("00000000-0000-4000-8000-000000000002"));
    private static readonly CategoryId Salary = new(Guid.Parse("00000000-0000-4000-8000-000000000003"));

    [Fact]
    public void It_learns_a_word_from_rows_whose_other_words_differ()
    {
        var model = CategoryModel.Train(
        [
            Row("maxima x vilnius", Groceries),
            Row("maxima lt kaunas", Groceries),
            Row("maxima xx klaipeda", Groceries),
            Row("circle k vilnius", Fuel),
            Row("circle k kaunas", Fuel),
            Row("circle k klaipeda", Fuel),
        ]);

        var guess = model.Predict(Tokens("maxima panevezys"), FlowType.Expense, 0m);

        Assert.NotNull(guess);
        Assert.Equal(Groceries, guess.CategoryId);
        Assert.Equal(3, guess.Support);
        Assert.True(guess.Confidence > 0.5m);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void The_account_decides_when_the_words_tie(bool onCard)
    {
        var model = CategoryModel.Train(
        [
            Row("revolut", Groceries, account: Current),
            Row("revolut", Groceries, account: Current),
            Row("revolut", Groceries, account: Current),
            Row("revolut", Fuel, account: Card),
            Row("revolut", Fuel, account: Card),
            Row("revolut", Fuel, account: Card),
        ]);

        var guess = model.Predict(Tokens("revolut", onCard ? Card : Current), FlowType.Expense, 0m);

        Assert.Equal(onCard ? Fuel : Groceries, guess?.CategoryId);
    }

    [Fact]
    public void The_amount_separates_a_snack_from_the_weekly_shop()
    {
        var model = CategoryModel.Train(
        [
            Row("maxima", Groceries, amount: 80m),
            Row("maxima", Groceries, amount: 95m),
            Row("maxima", Groceries, amount: 70m),
            Row("maxima", Fuel, amount: 3m),
            Row("maxima", Fuel, amount: 2.5m),
            Row("maxima", Fuel, amount: 3.2m),
        ]);

        Assert.Equal(Fuel, model.Predict(Tokens("maxima", amount: 2.8m), FlowType.Expense, 0m)?.CategoryId);
        Assert.Equal(Groceries, model.Predict(Tokens("maxima", amount: 88m), FlowType.Expense, 0m)?.CategoryId);
    }

    [Theory]
    [InlineData(2, false)]
    [InlineData(3, true)]
    public void It_abstains_below_the_support_floor(int rows, bool guesses)
    {
        var model = CategoryModel.Train(Enumerable.Range(0, rows).Select(_ => Row("rimi", Groceries)));

        var guess = model.Predict(Tokens("rimi"), FlowType.Expense, 0m);

        Assert.Equal(guesses, guess is not null);
    }

    [Fact]
    public void Account_and_amount_alone_are_no_support()
    {
        var model = CategoryModel.Train(Enumerable.Range(0, 5).Select(_ => Row("rimi", Groceries)));

        Assert.Null(model.Predict(Tokens("lidl"), FlowType.Expense, 0m));
    }

    [Fact]
    public void It_abstains_below_the_confidence_threshold()
    {
        var model = CategoryModel.Train(
        [
            Row("norfa", Groceries),
            Row("norfa", Groceries),
            Row("norfa", Groceries),
            Row("norfa", Fuel),
            Row("norfa", Fuel),
            Row("norfa", Fuel),
        ]);

        Assert.Null(model.Predict(Tokens("norfa"), FlowType.Expense));
        Assert.Equal(0.5m, model.Predict(Tokens("norfa"), FlowType.Expense, 0m)?.Confidence);
    }

    [Theory]
    [InlineData(FlowType.Expense)]
    [InlineData(FlowType.Income)]
    public void Only_categories_of_the_row_type_compete(FlowType type)
    {
        var model = CategoryModel.Train(
        [
            Row("employer uab", Salary, FlowType.Income),
            Row("employer uab", Salary, FlowType.Income),
            Row("employer uab", Salary, FlowType.Income),
            Row("employer uab", Groceries),
        ]);

        var posteriors = model.Posteriors(Tokens("employer uab"), type);

        Assert.Equal(type == FlowType.Income ? [Salary] : [Groceries], posteriors.Select(p => p.CategoryId));
    }

    [Fact]
    public void No_category_of_the_type_gives_no_guess()
    {
        var model = CategoryModel.Train(Enumerable.Range(0, 3).Select(_ => Row("rimi", Groceries)));

        Assert.Empty(model.Posteriors(Tokens("rimi"), FlowType.Income));
        Assert.Null(model.Predict(Tokens("rimi"), FlowType.Income, 0m));
    }

    [Fact]
    public void Confidences_over_the_competitors_sum_to_one()
    {
        var model = CategoryModel.Train(
        [
            Row("maxima vilnius", Groceries),
            Row("maxima kaunas", Groceries),
            Row("circle k vilnius", Fuel),
            Row("salary", Salary, FlowType.Income),
        ]);

        var posteriors = model.Posteriors(Tokens("maxima vilnius"), FlowType.Expense);

        Assert.Equal(2, posteriors.Count);
        Assert.Equal(1.0, posteriors.Sum(p => p.Probability), 12);
        Assert.True(posteriors[0].Probability >= posteriors[1].Probability);
    }

    [Fact]
    public void A_tie_breaks_by_category_id_whatever_the_training_order()
    {
        TrainingRow[] rows =
        [
            Row("iki", Fuel),
            Row("iki", Fuel),
            Row("iki", Fuel),
            Row("iki", Groceries),
            Row("iki", Groceries),
            Row("iki", Groceries),
        ];

        var forwards = CategoryModel.Train(rows).Predict(Tokens("iki"), FlowType.Expense, 0m);
        var backwards = CategoryModel.Train(Enumerable.Reverse(rows)).Predict(Tokens("iki"), FlowType.Expense, 0m);

        Assert.Equal(Groceries, forwards?.CategoryId);
        Assert.Equal(forwards, backwards);
    }

    private static TrainingRow Row(
        string key,
        CategoryId categoryId,
        FlowType type = FlowType.Expense,
        AccountId? account = null,
        decimal amount = 10m) =>
        new(Tokens(key, account, amount), categoryId, type);

    private static IReadOnlyList<string> Tokens(string key, AccountId? account = null, decimal amount = 10m) =>
        CategoryFeatures.Of(key, account ?? Current, amount);
}
