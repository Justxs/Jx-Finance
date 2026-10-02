using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Imports.Inbox;

namespace JxFinance.Tests.Unit;

public sealed class InboxRulesTests
{
    private const string Iban = "LT121000011101001000";
    private const long Megabyte = 1024 * 1024;

    [Theory]
    [InlineData("statement.xml", StatementFormat.Camt053)]
    [InlineData("STATEMENT.XML", StatementFormat.Camt053)]
    [InlineData("bank.ofx", StatementFormat.Ofx)]
    [InlineData("bank.qfx", StatementFormat.Ofx)]
    [InlineData("bank.sta", StatementFormat.Mt940)]
    [InlineData("bank.mt940", StatementFormat.Mt940)]
    [InlineData("bank.940", StatementFormat.Mt940)]
    [InlineData("export.csv", StatementFormat.GenericCsv)]
    public void The_format_comes_from_the_extension(string fileName, StatementFormat format) =>
        Assert.Equal(format, InboxRules.FormatOf(fileName));

    [Theory]
    [InlineData("statement.pdf")]
    [InlineData("statement")]
    [InlineData("statement.xml.bak")]
    public void A_file_of_another_extension_has_no_format_and_is_refused(string fileName)
    {
        Assert.Null(InboxRules.FormatOf(fileName));
        Assert.StartsWith("Not a statement file", InboxRules.Problem(fileName, 10));
    }

    [Fact]
    public void An_empty_file_is_refused() =>
        Assert.Equal("The file is empty.", InboxRules.Problem("statement.xml", 0));

    [Theory]
    [InlineData("statement.xml", 20 * Megabyte, null)]
    [InlineData("statement.xml", 20 * Megabyte + 1, "The file is larger than 20 MB, the limit for this format.")]
    [InlineData("export.csv", 5 * Megabyte, null)]
    [InlineData("export.csv", 5 * Megabyte + 1, "The file is larger than 5 MB, the limit for this format.")]
    [InlineData("bank.ofx", 5 * Megabyte + 1, "The file is larger than 5 MB, the limit for this format.")]
    public void Each_format_keeps_its_own_size_limit(string fileName, long size, string? problem) =>
        Assert.Equal(problem, InboxRules.Problem(fileName, size));

    [Fact]
    public void A_statement_without_an_iban_is_refused()
    {
        var result = InboxRules.AccountFor(null, [Account(Iban)]);

        Assert.Equal(ErrorCodes.ImportInvalidFile, result.ErrorCode);
        Assert.StartsWith("The statement names no IBAN.", result.ErrorMessage);
    }

    [Fact]
    public void An_iban_no_account_has_is_refused_with_the_iban()
    {
        var result = InboxRules.AccountFor(Iban, [Account("LT601010012345678901")]);

        Assert.Equal($"No account has the IBAN {Iban}. Record it on the account first.", result.ErrorMessage);
    }

    [Fact]
    public void The_one_account_with_the_iban_is_chosen_ignoring_spaces_and_case()
    {
        var wanted = Account("LT12 1000 0111 0100 1000");

        var result = InboxRules.AccountFor("lt12 1000011101001000", [Account("LT601010012345678901"), wanted]);

        Assert.True(result.TryGetValue(out var account));
        Assert.Equal(wanted, account);
    }

    [Fact]
    public void An_iban_two_accounts_share_is_refused()
    {
        var result = InboxRules.AccountFor(Iban, [Account(Iban), Account(Iban.ToLowerInvariant())]);

        Assert.Equal(ErrorCodes.ImportInvalidFile, result.ErrorCode);
        Assert.StartsWith($"2 accounts have the IBAN {Iban}", result.ErrorMessage);
    }

    [Fact]
    public void The_one_mapping_that_reads_the_file_is_chosen()
    {
        var mapping = new InboxReader(StatementFormat.GenericCsv, Guid.NewGuid(), "Revolut");

        Assert.Equal(mapping, InboxRules.ReaderFor([mapping], swedbank: true).Value);
    }

    [Fact]
    public void Without_a_mapping_a_swedbank_export_is_read_as_swedbank_csv()
    {
        var reader = InboxRules.ReaderFor([], swedbank: true).Value!;

        Assert.Equal(StatementFormat.SwedbankCsv, reader.Format);
        Assert.Null(reader.MappingId);
    }

    [Fact]
    public void Without_a_mapping_another_csv_is_refused() =>
        Assert.StartsWith("None of the account owner's saved CSV mappings reads this file.", InboxRules.ReaderFor([], swedbank: false).ErrorMessage);

    [Fact]
    public void Two_mappings_that_both_read_the_file_are_refused_by_name()
    {
        var result = InboxRules.ReaderFor(
            [new InboxReader(StatementFormat.GenericCsv, Guid.NewGuid(), "Bank A"), new InboxReader(StatementFormat.GenericCsv, Guid.NewGuid(), "Bank B")],
            swedbank: true);

        Assert.Equal(ErrorCodes.ImportInvalidFile, result.ErrorCode);
        Assert.Contains("(Bank A, Bank B)", result.ErrorMessage);
    }

    [Fact]
    public void A_file_of_several_statements_asks_for_the_iban_folder()
    {
        var error = InboxRules.Unreadable(
            StatementFormat.Camt053,
            new DomainError(ErrorCodes.ImportNoStatementForAccount, "LT12, LT60"));

        Assert.Equal(ErrorCodes.ImportInvalidFile, error.Code);
        Assert.Equal("The file holds several statements (LT12, LT60). Put it in a folder named after the IBAN of the one to import.", error.Message);
    }

    [Fact]
    public void Another_parse_error_names_the_format()
    {
        var error = InboxRules.Unreadable(StatementFormat.Ofx, new DomainError(ErrorCodes.ImportInvalidFile, "No transactions."));

        Assert.Equal("Not a readable Ofx file: No transactions.", error.Message);
    }

    private static InboxAccount Account(string iban) => new(Guid.NewGuid(), Guid.NewGuid(), iban, Currency.Eur);
}
