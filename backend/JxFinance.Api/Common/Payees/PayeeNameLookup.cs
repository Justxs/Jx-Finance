using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Payees;

public static class PayeeNameLookup
{
    public static async Task<IReadOnlyDictionary<string, string>> PayeeNamesForAsync(
        this AppDbContext db,
        IEnumerable<string?> payeeKeys,
        CancellationToken cancellationToken)
    {
        var keys = payeeKeys.OfType<string>().Where(key => key.Length > 0).Distinct().ToList();
        if (keys.Count == 0)
        {
            return new Dictionary<string, string>();
        }

        return await db.PayeeNames
            .Where(p => keys.Contains(p.PayeeKey))
            .ToDictionaryAsync(p => p.PayeeKey, p => p.Name, cancellationToken);
    }
}
