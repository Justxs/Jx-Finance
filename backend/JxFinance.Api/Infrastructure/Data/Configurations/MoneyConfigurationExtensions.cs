using JxFinance.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

internal static class MoneyConfigurationExtensions
{
    public static void HasColumns(this ComplexPropertyBuilder<Money> money, string amountColumn, string currencyColumn)
    {
        money.Property(m => m.Amount).HasColumnName(amountColumn);
        money.Property(m => m.Currency).HasColumnName(currencyColumn);
    }
}
