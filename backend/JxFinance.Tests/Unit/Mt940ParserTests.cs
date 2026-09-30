using System.Text;
using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.Imports.Parsing;

namespace JxFinance.Tests.Unit;

public sealed class Mt940ParserTests
{
    private const string Statement = """
        {1:F01BANKLT2XAXXX0000000000}{4:
        :20:STMT260930
        :25:LT121000011101001000EUR
        :28C:00001/001
        :60F:C260901EUR1000,00
        :61:2609020902DR15,77NMSCNONREF//BANK0001
        :86:?20PIRKINYS LIDL?21VILNIUS?32LIDL LIETUVA
        ?31LT112222333344445555
        :61:260905C1000,00NTRFREF-7//BANK0002
        :86:Employer UAB salary
        September
        :61:260906RC20,00NTRFNONREF
        :62F:C260930EUR1964,23
        -}
        """;

    [Fact]
    public void Statement_lines_read_their_direction_details_and_references()
    {
        var statement = Parse(Statement);

        Assert.Equal(
            [
                (new DateOnly(2026, 9, 2), 15.77m, FlowType.Expense, "LIDL LIETUVA", "PIRKINYS LIDL VILNIUS", "LT112222333344445555", false),
                (new DateOnly(2026, 9, 5), 1000m, FlowType.Income, null, "Employer UAB salary September", null, false),
                (new DateOnly(2026, 9, 6), 20m, FlowType.Expense, null, null, null, true),
            ],
            statement.Rows.Select(r => (r.Date, r.Amount, r.Type, r.Payee, r.Description, r.CounterpartyIban, r.IsReversal)));
        Assert.All(statement.Rows, r => Assert.Equal(Currency.Eur, r.Currency));
        Assert.Equal(3, statement.Rows.Select(r => r.ImportRef).Distinct().Count());
    }

    [Fact]
    public void The_account_and_closing_balance_come_from_tags_25_and_62()
    {
        var statement = Parse(Statement);

        Assert.Equal("LT121000011101001000", statement.Iban);
        Assert.Equal((new DateOnly(2026, 9, 30), new Money(1964.23m, Currency.Eur)), (statement.ClosingDate, statement.ClosingBalance));
    }

    [Fact]
    public void The_same_file_gives_the_same_references_twice()
    {
        Assert.Equal(Parse(Statement).Rows.Select(r => r.ImportRef), Parse(Statement).Rows.Select(r => r.ImportRef));
    }

    [Fact]
    public void Text_without_statement_tags_is_refused()
    {
        var result = Mt940Parser.Parse(new MemoryStream(Encoding.UTF8.GetBytes("<OFX></OFX>")), Currency.Eur);

        Assert.Equal(ErrorCodes.ImportInvalidFile, result.Error.Code);
    }

    private static ParsedStatement Parse(string text) =>
        Mt940Parser.Parse(new MemoryStream(Encoding.UTF8.GetBytes(text)), Currency.Eur).Value!;
}
