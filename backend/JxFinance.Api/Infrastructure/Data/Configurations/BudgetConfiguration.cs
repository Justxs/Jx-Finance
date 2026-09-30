using JxFinance.Domain.Budgets;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class BudgetConfiguration : IEntityTypeConfiguration<Budget>
{
    public void Configure(EntityTypeBuilder<Budget> builder) =>
        builder.ToTable(table => table.HasCheckConstraint(
            "CK_Budgets_CategoryOrTag",
            """("CategoryId" IS NULL) <> ("TagId" IS NULL)"""));
}
