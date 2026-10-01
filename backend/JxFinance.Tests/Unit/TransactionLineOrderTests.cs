using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.Mappers;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Tests.Unit;

public sealed class TransactionLineOrderTests
{
    [Fact]
    public void Split_lines_are_numbered_in_the_order_they_were_sent()
    {
        TransactionLineRequest[] requested =
        [
            new(null, 5m, null),
            new(null, 30m, null),
            new(null, 1.5m, null),
        ];

        var lines = requested.ToLines(TransactionId.New(), Guid.NewGuid(), Currency.Eur);

        Assert.Equal([0, 1, 2], lines.Select(l => l.Position));
        Assert.Equal([5m, 30m, 1.5m], lines.Select(l => l.Amount.Amount));
    }
}
