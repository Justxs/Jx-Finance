namespace JxFinance.Infrastructure.Auth;

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Member = "Member";

    public static IReadOnlyList<string> All { get; } = [Admin, Member];
}
