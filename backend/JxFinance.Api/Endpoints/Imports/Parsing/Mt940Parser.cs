using System.Globalization;
using System.Text.RegularExpressions;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Accounts.Shared;

namespace JxFinance.Endpoints.Imports.Parsing;

public static partial class Mt940Parser
{
    public static Result<ParsedStatement> Parse(Stream stream, Currency accountCurrency)
    {
        var fields = Fields(StatementText.Read(stream));
        if (!fields.Any(field => field.Tag == "20") || !fields.Any(field => field.Tag == "61"))
        {
            return fields.Any(field => field.Tag == "20") && fields.Any(field => field.Tag.StartsWith("62", StringComparison.Ordinal))
                ? new ParsedStatement([], AccountOf(fields))
                : Invalid();
        }

        var currency = BalanceOf(fields.FirstOrDefault(field => field.Tag.StartsWith("60", StringComparison.Ordinal)).Value)?.Currency ?? accountCurrency;
        var rows = new List<ParsedRow>();
        var unreadable = 0;
        for (var index = 0; index < fields.Count; index++)
        {
            if (fields[index].Tag != "61")
            {
                continue;
            }

            var information = index + 1 < fields.Count && fields[index + 1].Tag == "86" ? fields[index + 1].Value : null;
            if (Row(fields[index].Value, information, currency) is { } row)
            {
                rows.Add(row);
            }
            else
            {
                unreadable++;
            }
        }

        if (rows.Count > ParsedStatement.MaxRows)
        {
            return Invalid();
        }

        ImportReferences.Disambiguate(rows);

        var closing = BalanceOf(fields.LastOrDefault(field => field.Tag.StartsWith("62", StringComparison.Ordinal)).Value);
        return new ParsedStatement(
            rows,
            AccountOf(fields),
            closing?.Date,
            closing is { } balance ? new Money(balance.Amount, balance.Currency) : null,
            0,
            unreadable);
    }

    private static List<(string Tag, string Value)> Fields(string text)
    {
        var fields = new List<(string Tag, string Value)>();
        foreach (var line in text.Split(["\r\n", "\n"], StringSplitOptions.None))
        {
            if (TagPattern().Match(line) is { Success: true } tag)
            {
                fields.Add((tag.Groups["tag"].Value, tag.Groups["value"].Value));
            }
            else if (fields.Count > 0 && line.Length > 0 && line != "-" && !line.StartsWith('{') && !line.StartsWith('}'))
            {
                fields[^1] = (fields[^1].Tag, fields[^1].Value + "\n" + line);
            }
        }

        return fields;
    }

    private static ParsedRow? Row(string line, string? information, Currency currency)
    {
        var first = line.Split('\n')[0];
        var match = StatementLinePattern().Match(first);
        if (!match.Success
            || Date(match.Groups["date"].Value) is not { } date
            || !decimal.TryParse(match.Groups["amount"].Value.Replace(',', '.'), NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var amount)
            || amount == 0m)
        {
            return null;
        }

        var mark = match.Groups["mark"].Value;
        var type = mark is "C" or "RD" ? FlowType.Income : FlowType.Expense;
        var (payee, description, counterpartyIban) = Details(information);
        var bankReference = match.Groups["bank"].Value.Trim();
        var customerReference = match.Groups["customer"].Value.Trim();
        var known = new[] { bankReference, customerReference }
            .FirstOrDefault(value => value.Length > 0 && !value.Equals("NONREF", StringComparison.OrdinalIgnoreCase));
        var reference = ImportReferences.Hash(
            $"{date:yyyy-MM-dd}|{amount.ToString(CultureInfo.InvariantCulture)}|{mark}|{known}|{counterpartyIban}|{description}");

        return new ParsedRow(
            reference,
            date,
            payee,
            description?[..Math.Min(description.Length, ParsedStatement.DescriptionMaxLength)],
            decimal.Round(amount, 2),
            type,
            currency,
            counterpartyIban,
            mark.StartsWith('R'));
    }

    private static (string? Payee, string? Description, string? CounterpartyIban) Details(string? information)
    {
        if (information is null)
        {
            return (null, null, null);
        }

        var flat = information.Replace("\n", "");
        if (!SubfieldPattern().IsMatch(flat))
        {
            var plain = string.Join(" ", information.Split('\n').Select(part => part.Trim()).Where(part => part.Length > 0));
            return (null, plain.Length > 0 ? plain : null, null);
        }

        var subfields = SubfieldPattern().Matches(flat)
            .Select(match => (Code: int.Parse(match.Groups["code"].Value, CultureInfo.InvariantCulture), Text: match.Groups["text"].Value.Trim()))
            .ToList();
        string? Joined(Func<int, bool> codes) =>
            string.Join(" ", subfields.Where(field => codes(field.Code) && field.Text.Length > 0).Select(field => field.Text)) is { Length: > 0 } joined
                ? joined
                : null;

        var account = Iban.Normalize(Joined(code => code == 31));
        return (
            Joined(code => code is 32 or 33),
            Joined(code => code is >= 20 and <= 29 or >= 60 and <= 63),
            account is { Length: >= 15 } && char.IsLetter(account[0]) ? account : null);
    }

    private static string? AccountOf(List<(string Tag, string Value)> fields)
    {
        var value = fields.FirstOrDefault(field => field.Tag == "25").Value;
        var account = Iban.Normalize(value?.Split('/')[^1].Trim());
        if (account is { Length: > 3 } && CurrencyCode.TryParse(account[^3..], out _) && account.Length > 18)
        {
            account = account[..^3];
        }

        return account is { Length: >= 15 } && char.IsLetter(account[0]) ? account : null;
    }

    private static (DateOnly Date, decimal Amount, Currency Currency)? BalanceOf(string? value)
    {
        var match = BalancePattern().Match(value ?? "");
        if (!match.Success
            || Date(match.Groups["date"].Value) is not { } date
            || !CurrencyCode.TryParse(match.Groups["currency"].Value, out var currency)
            || !decimal.TryParse(match.Groups["amount"].Value.Replace(',', '.'), NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var amount))
        {
            return null;
        }

        return (date, match.Groups["mark"].Value == "D" ? -amount : amount, currency);
    }

    private static DateOnly? Date(string text) =>
        DateOnly.TryParseExact(text, "yyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) ? date : null;

    private static DomainError Invalid() => new(
        ErrorCodes.ImportInvalidFile,
        "The file is not an MT940 bank statement.");

    [GeneratedRegex(@"^:(?<tag>\d{2}[A-Z]?):(?<value>.*)$", RegexOptions.CultureInvariant, 1000)]
    private static partial Regex TagPattern();

    [GeneratedRegex(@"^(?<date>\d{6})(?<entry>\d{4})?(?<mark>R?[CD])[A-Z]?(?<amount>\d+,\d{0,2})[NFS][A-Z0-9]{3}(?<customer>.*?)(?://(?<bank>.*))?$", RegexOptions.CultureInvariant, 1000)]
    private static partial Regex StatementLinePattern();

    [GeneratedRegex(@"^(?<mark>[CD])(?<date>\d{6})(?<currency>[A-Z]{3})(?<amount>\d+,\d{0,2})", RegexOptions.CultureInvariant, 1000)]
    private static partial Regex BalancePattern();

    [GeneratedRegex(@"\?(?<code>\d{2})(?<text>[^?]*)", RegexOptions.CultureInvariant, 1000)]
    private static partial Regex SubfieldPattern();
}
