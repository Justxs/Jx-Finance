using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Accounts.Shared;
using JxFinance.Endpoints.Imports.Parsing;

namespace JxFinance.Endpoints.Imports.Inbox;

public static class InboxRules
{
    private static readonly Dictionary<string, StatementFormat> Extensions = new(StringComparer.OrdinalIgnoreCase)
    {
        [".xml"] = StatementFormat.Camt053,
        [".ofx"] = StatementFormat.Ofx,
        [".qfx"] = StatementFormat.Ofx,
        [".sta"] = StatementFormat.Mt940,
        [".mt940"] = StatementFormat.Mt940,
        [".940"] = StatementFormat.Mt940,
        [".csv"] = StatementFormat.GenericCsv,
    };

    public static StatementFormat? FormatOf(string fileName) =>
        Extensions.TryGetValue(Path.GetExtension(fileName), out var format) ? format : null;

    public static string? Problem(string fileName, long size) =>
        FormatOf(fileName) switch
        {
            null => "Not a statement file: the inbox reads .xml (camt.053), .ofx and .qfx, .sta, .mt940 and .940 (MT940) and .csv files.",
            _ when size == 0 => "The file is empty.",
            { } format when size > StatementReader.MaxBytes(format) =>
                $"The file is larger than {StatementReader.MaxBytes(format) / (1024 * 1024)} MB, the limit for this format.",
            _ => null,
        };

    public static Result<InboxAccount> AccountFor(string? iban, IReadOnlyList<InboxAccount> accounts)
    {
        var wanted = Iban.Normalize(iban);
        if (wanted is null)
        {
            return Refused("The statement names no IBAN. Put the file in a folder named after its account's IBAN.");
        }

        var matching = accounts.Where(a => Iban.Normalize(a.Iban) == wanted).ToList();
        return matching.Count switch
        {
            1 => matching[0],
            0 => Refused($"No account has the IBAN {wanted}. Record it on the account first."),
            _ => Refused($"{matching.Count} accounts have the IBAN {wanted}, so the inbox cannot tell whose statement it is."),
        };
    }

    public static Result<InboxReader> ReaderFor(IReadOnlyList<InboxReader> mappings, bool swedbank) =>
        mappings.Count switch
        {
            1 => mappings[0],
            0 when swedbank => new InboxReader(StatementFormat.SwedbankCsv, null),
            0 => Refused("None of the account owner's saved CSV mappings reads this file. Save a mapping by importing one file by hand."),
            _ => Refused($"Several saved CSV mappings read this file ({string.Join(", ", mappings.Select(m => m.Name))}), so the inbox cannot choose."),
        };

    public static DomainError Unreadable(StatementFormat format, DomainError error) =>
        Refused(error.Code == ErrorCodes.ImportNoStatementForAccount
            ? $"The file holds several statements ({error.Message}). Put it in a folder named after the IBAN of the one to import."
            : $"Not a readable {format} file: {error.Message}");

    public static DomainError Refused(string reason) => new(ErrorCodes.ImportInvalidFile, reason);
}

public sealed record InboxAccount(Guid Id, Guid UserId, string? Iban, Currency Currency);

public sealed record InboxReader(StatementFormat Format, Guid? MappingId, string Name = "");

public sealed record InboxDrop(string? Folder, string FileName, byte[] Content);
