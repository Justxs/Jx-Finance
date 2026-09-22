using System.Data;
using System.Data.Common;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace JxFinance.Tests.Unit;

public sealed class SqlCapture : IAsyncDisposable
{
    private readonly Recorder recorder = new();
    private readonly AppDbContext db;

    public SqlCapture(Guid? userId = null, HouseholdId? householdId = null)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=unused.invalid;Database=unused")
            .AddInterceptors(recorder, new NoConnection())
            .Options;
        db = new AppDbContext(options, new SomeUser(userId ?? Guid.NewGuid(), householdId), new TestClock());
    }

    public AppDbContext Db => db;

    public IReadOnlyList<string> Statements => recorder.Statements;

    public IReadOnlyList<object?> Values => recorder.Values;

    public string OnlyStatement => Assert.Single(recorder.Statements);

    public ValueTask DisposeAsync() => db.DisposeAsync();

    private sealed record SomeUser(Guid Id, HouseholdId? ActiveHouseholdId) : ICurrentUser;

    private sealed class NoConnection : DbConnectionInterceptor
    {
        public override ValueTask<InterceptionResult> ConnectionOpeningAsync(
            DbConnection connection,
            ConnectionEventData eventData,
            InterceptionResult result,
            CancellationToken cancellationToken = default) =>
            ValueTask.FromResult(InterceptionResult.Suppress());
    }

    private sealed class Recorder : DbCommandInterceptor
    {
        public List<string> Statements { get; } = [];

        public List<object?> Values { get; } = [];

        public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            Record(command);
            return ValueTask.FromResult(InterceptionResult<int>.SuppressWithResult(0));
        }

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default)
        {
            Record(command);
            return ValueTask.FromResult(InterceptionResult<DbDataReader>.SuppressWithResult(new DataTable().CreateDataReader()));
        }

        private void Record(DbCommand command)
        {
            Statements.Add(command.CommandText);
            foreach (DbParameter parameter in command.Parameters)
            {
                Values.Add(parameter.Value is DBNull ? null : parameter.Value);
            }
        }
    }
}
