using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.Auth;

public static class RecoveryCommand
{
    public static async Task RunAsync(IServiceProvider services, string email)
    {
        using var scope = services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var user = await users.FindByEmailAsync(email);
        if (user is null || !await users.IsInRoleAsync(user, AppRoles.Admin))
            throw new InvalidOperationException("An existing administrator is required. This command does not provision users.");
        if (Console.IsInputRedirected) throw new InvalidOperationException("Run recovery in an interactive terminal.");
        Console.WriteLine("Administrator recovery resets the password, 2FA and passkeys, and revokes existing sessions.");
        Console.Write("New password: ");
        var password = ReadPassword();
        Console.Write("Confirm password: ");
        if (ReadPassword() != password) throw new InvalidOperationException("Passwords do not match.");
        await RecoverAsync(scope.ServiceProvider, user, password);
        Console.WriteLine("Administrator recovered. Sign in, then enrol 2FA and add passkeys again if needed.");
    }

    internal static async Task RecoverAsync(IServiceProvider services, AppUser user, string password)
    {
        var users = services.GetRequiredService<UserManager<AppUser>>();
        var token = await users.GeneratePasswordResetTokenAsync(user);
        var result = await users.ResetPasswordAsync(user, token, password);
        if (!result.Succeeded) throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        await users.SetTwoFactorEnabledAsync(user, false);
        await users.ResetAuthenticatorKeyAsync(user);
        await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 0);
        await services.GetRequiredService<AppDbContext>().UserPasskeys.Where(p => p.UserId == user.Id).ExecuteDeleteAsync();
        await users.SetLockoutEndDateAsync(user, null);
        await users.ResetAccessFailedCountAsync(user);
        await users.UpdateSecurityStampAsync(user);
    }

    private static string ReadPassword()
    {
        var value = new System.Text.StringBuilder();
        while (true)
        {
            var key = Console.ReadKey(intercept: true);
            if (key.Key == ConsoleKey.Enter) { Console.WriteLine(); return value.ToString(); }
            if (key.Key == ConsoleKey.Backspace) { if (value.Length > 0) value.Length--; }
            else if (!char.IsControl(key.KeyChar)) value.Append(key.KeyChar);
        }
    }
}
