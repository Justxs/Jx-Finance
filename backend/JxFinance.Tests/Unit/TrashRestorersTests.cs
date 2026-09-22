using JxFinance.Domain.Settings;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Trash.Services;

namespace JxFinance.Tests.Unit;

public sealed class TrashRestorersTests
{
    [Fact]
    public void Every_trash_kind_has_a_restorer()
    {
        var missing = Enum.GetValues<TrashKind>().Where(kind => TrashRestorers.Of(kind) is null).ToList();

        Assert.Empty(missing);
    }

    [Theory]
    [InlineData(TrashKind.Transaction, null)]
    [InlineData(TrashKind.Transfer, null)]
    [InlineData(TrashKind.Conversion, Feature.MultiCurrency)]
    [InlineData(TrashKind.Budget, Feature.Budgets)]
    [InlineData(TrashKind.Goal, Feature.Goals)]
    [InlineData(TrashKind.Asset, Feature.NetWorth)]
    [InlineData(TrashKind.Debt, Feature.NetWorth)]
    [InlineData(TrashKind.RecurringBill, Feature.RecurringBills)]
    [InlineData(TrashKind.InvestmentTransaction, Feature.Investments)]
    [InlineData(TrashKind.Category, null)]
    [InlineData(TrashKind.Tag, null)]
    [InlineData(TrashKind.CategorizationRule, Feature.CategorizationRules)]
    [InlineData(TrashKind.Household, Feature.Households)]
    [InlineData(TrashKind.Attachment, null)]
    public void Each_kind_belongs_to_its_feature(TrashKind kind, Feature? feature) =>
        Assert.Equal(feature, TrashRestorers.FeatureOf(kind));

    [Theory]
    [InlineData(TrashKind.Category)]
    [InlineData(TrashKind.Tag)]
    [InlineData(TrashKind.CategorizationRule)]
    [InlineData(TrashKind.Household)]
    public void Kinds_that_record_changes_load_them(TrashKind kind) =>
        Assert.True(TrashRestorers.Of(kind)!.UsesChanges);
}
