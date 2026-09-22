using JxFinance.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class UserSessionConfiguration : IEntityTypeConfiguration<UserSession>
{
    public void Configure(EntityTypeBuilder<UserSession> builder)
    {
        builder.Property(s => s.TokenHash).HasMaxLength(64);
        builder.Property(s => s.PreviousTokenHash).HasMaxLength(64);
        builder.Property(s => s.SecurityStamp).HasMaxLength(256);
        builder.Property(s => s.UserAgent).HasMaxLength(UserSession.UserAgentMaxLength);
        builder.HasOne<AppUser>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
