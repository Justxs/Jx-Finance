using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Infrastructure.Data.Auditing;

namespace JxFinance.Tests.Unit;

public sealed class AuditCollectorTests
{
    [Fact]
    public void Every_shared_record_type_is_audited()
    {
        var expected = typeof(IShareable).Assembly.GetTypes()
            .Where(type => type is { IsClass: true, IsAbstract: false }
                && (typeof(IShareable).IsAssignableFrom(type) || typeof(IAccountScoped).IsAssignableFrom(type)))
            .Concat([typeof(Transfer), typeof(Household), typeof(HouseholdMembership), typeof(TransactionAttachment)]);

        var missing = expected.Except(AuditCollector.AuditedTypes).Select(type => type.Name).ToList();

        Assert.Empty(missing);
    }
}
