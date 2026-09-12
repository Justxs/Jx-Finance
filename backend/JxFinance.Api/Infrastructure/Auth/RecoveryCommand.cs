using Microsoft.AspNetCore.Identity;

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
        Console.WriteLine("Administrator recovery resets the password and 2FA, and revokes existing sessions.");
        Console.Write("New password: ");
        var password = ReadPassword();
        Console.Write("Confirm password: ");
        if (ReadPassword() != password) throw new InvalidOperationException("Passwords do not match.");
        var token = await users.GeneratePasswordResetTokenAsync(user);
        var result = await users.ResetPasswordAsync(user, token, password);
        if (!result.Succeeded) throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));
        await users.SetTwoFactorEnabledAsync(user, false);
        await users.ResetAuthenticatorKeyAsync(user);
        await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 0);
        await users.SetLockoutEndDateAsync(user, null);
        await users.UpdateSecurityStampAsync(user);
        Console.WriteLine("Administrator recovered. Sign in and enrol 2FA again if needed.");
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
