using System.Globalization;
using System.Text;
using JxFinance.Common;

namespace JxFinance.Endpoints.Backups.RestoreBackup;

public sealed record RestoreBackupRequest(Guid Id, string Password)
{
    private bool PrintMembers(StringBuilder builder)
    {
        builder.Append(CultureInfo.InvariantCulture, $"Id = {Id}, Password = {SecretText.Hidden}");
        return true;
    }
}
