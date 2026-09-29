using JxFinance.Domain.Households;
using JxFinance.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class SharedExpenseShareConfiguration : IEntityTypeConfiguration<SharedExpenseShare>
{
    public void Configure(EntityTypeBuilder<SharedExpenseShare> builder)
    {
        builder.HasKey(s => new { s.SharedExpenseId, s.UserId });
        builder.HasOne<SharedExpense>().WithMany().HasForeignKey(s => s.SharedExpenseId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<AppUser>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Restrict);
    }
}
