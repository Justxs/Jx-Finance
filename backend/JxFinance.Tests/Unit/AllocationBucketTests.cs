using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;

namespace JxFinance.Tests.Unit;

public sealed class AllocationBucketTests
{
    [Fact]
    public void Type_and_currency_keys_are_the_camel_case_names_the_portfolio_answers()
    {
        Assert.Equal("etf", AllocationBucket.Of(SecurityType.Etf));
        Assert.Equal("eur", AllocationBucket.Of(Currency.Eur));
        Assert.True(AllocationBucket.IsWellFormed(AllocationDimension.Type, "crypto"));
        Assert.True(AllocationBucket.IsWellFormed(AllocationDimension.Currency, "usd"));
    }

    [Theory]
    [InlineData(AllocationDimension.Type, "Etf")]
    [InlineData(AllocationDimension.Type, "eur")]
    [InlineData(AllocationDimension.Currency, "EUR")]
    [InlineData(AllocationDimension.Currency, "stock")]
    [InlineData(AllocationDimension.Security, "00000000-0000-0000-0000-000000000000")]
    [InlineData(AllocationDimension.Security, "9F1C7E2A-1111-4C2B-8F11-0123456789AB")]
    [InlineData(AllocationDimension.Security, "9f1c7e2a11114c2b8f110123456789ab")]
    [InlineData(AllocationDimension.Security, null)]
    public void A_key_of_another_dimension_or_spelling_is_not_well_formed(AllocationDimension dimension, string? key)
    {
        Assert.False(AllocationBucket.IsWellFormed(dimension, key));
    }

    [Fact]
    public void A_security_key_is_its_id_in_lower_case_with_hyphens()
    {
        var id = new SecurityId(Guid.NewGuid());

        Assert.True(AllocationBucket.IsWellFormed(AllocationDimension.Security, AllocationBucket.Of(id)));
    }
}
