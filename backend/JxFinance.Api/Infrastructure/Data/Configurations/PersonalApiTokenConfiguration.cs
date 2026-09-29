using JxFinance.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace JxFinance.Infrastructure.Data.Configurations;

public sealed class PersonalApiTokenConfiguration : IEntityTypeConfiguration<PersonalApiToken>
{
    public void Configure(EntityTypeBuilder<PersonalApiToken> builder)
    {
        builder.Property(t => t.Name).HasMaxLength(PersonalApiToken.NameMaxLength);
        builder.Property(t => t.Prefix).HasMaxLength(PersonalApiTokenFormat.PrefixLength).IsFixedLength();
        builder.Property(t => t.SecretHash).HasMaxLength(PersonalApiTokenFormat.HashLength).IsFixedLength();
        builder.HasIndex(t => t.Prefix).IsUnique();
        builder.HasOne<AppUser>().WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
