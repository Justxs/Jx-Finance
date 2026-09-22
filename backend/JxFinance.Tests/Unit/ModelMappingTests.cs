using JxFinance.Domain.Investments;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace JxFinance.Tests.Unit;

public sealed class ModelMappingTests
{
    [Fact]
    public async Task Every_decimal_column_states_its_precision()
    {
        await using var capture = new SqlCapture();

        var decimals = Decimals(capture.Db.Model).ToList();

        Assert.NotEmpty(decimals);
        Assert.All(decimals, property => Assert.NotNull(property.GetPrecision()));
        Assert.All(decimals, property => Assert.NotNull(property.GetScale()));
    }

    [Fact]
    public async Task Money_columns_take_the_two_place_default()
    {
        await using var capture = new SqlCapture();

        Assert.Equal("numeric(18,2)", ColumnType<Transaction>(capture.Db, "Amount"));
        Assert.Equal("numeric(18,2)", ColumnType<Transaction>(capture.Db, "ReportingAmount"));
        Assert.Equal("numeric(18,2)", ColumnType<NetWorthSnapshot>(capture.Db, "NetWorthValue"));
    }

    [Fact]
    public async Task Columns_that_asked_for_more_places_keep_them()
    {
        await using var capture = new SqlCapture();

        Assert.Equal("numeric(20,8)", ColumnType<InvestmentTransaction>(capture.Db, "Quantity"));
        Assert.Equal("numeric(18,8)", ColumnType<SecurityPrice>(capture.Db, "Price"));
        Assert.Equal("numeric(5,2)", ColumnType<Debt>(capture.Db, "InterestRate"));
    }

    [Fact]
    public async Task Every_foreign_key_is_covered_by_an_index()
    {
        await using var capture = new SqlCapture();

        var keys = capture.Db.Model.GetEntityTypes().SelectMany(entity => entity.GetForeignKeys()).ToList();

        Assert.NotEmpty(keys);
        Assert.All(keys, key => Assert.Contains(Lookups(key.DeclaringEntityType), properties =>
            properties.Take(key.Properties.Count).SequenceEqual(key.Properties)));
    }

    private static IEnumerable<IReadOnlyList<IProperty>> Lookups(IEntityType entity) =>
        entity.GetIndexes().Select(index => index.Properties)
            .Concat(entity.GetKeys().Select(key => key.Properties));

    private static string? ColumnType<TEntity>(DbContext db, string columnName) =>
        Decimals(db.Model)
            .Single(property => property.DeclaringType.ContainingEntityType.ClrType == typeof(TEntity) &&
                property.GetColumnName() == columnName)
            .GetColumnType();

    private static IEnumerable<IProperty> Decimals(IModel model) =>
        model.GetEntityTypes().SelectMany(Properties)
            .Where(property => (Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType) == typeof(decimal));

    private static IEnumerable<IProperty> Properties(ITypeBase type) =>
        type.GetDeclaredProperties()
            .Concat(type.GetDeclaredComplexProperties().SelectMany(complex => Properties(complex.ComplexType)));
}
