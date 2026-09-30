using JxFinance.Common.Errors;
using JxFinance.Domain.Investments;
using JxFinance.Endpoints.Backups.Interfaces;
using JxFinance.Endpoints.Backups.Services;
using JxFinance.Endpoints.Backups.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;
using NpgsqlTypes;

namespace JxFinance.Endpoints.Users.Services;

public sealed class MemberImport(AppDbContext db, Guid userId, int lockTimeoutSeconds) : IBackupVisitor, IAsyncDisposable
{
    public static readonly IReadOnlySet<string> Imported = new HashSet<string>(StringComparer.Ordinal)
    {
        "Accounts", "AccountReconciliations", "Assets", "AssetValuations", "Budgets", "Categories",
        "CategorizationRules", "CategorizationRuleTags", "CsvImportMappings", "CurrencyConversions", "DebtPayments",
        "Debts", "Goals", "InvestmentTransactions", "NetWorthSnapshots", "PayeeNames", "ReceiptItemCategories",
        "ReceiptReadings", "RecurringBills", "Securities", "SubscriptionDismissals", "SuggestedRuleDismissals",
        "Tags", "Transactions", "TransactionAttachments", "TransactionLines", "TransactionTags", "TransferImports",
        "Transfers",
    };

    private const string SecuritiesTable = "Securities";
    private const string AttachmentsTable = "TransactionAttachments";
    private const string UsersTable = "AspNetUsers";
    private const string HouseholdsTable = "Households";
    private const string CategoriesTable = "Categories";
    private const int InsertBatchSize = 500;
    private const int MaxRepairPasses = 10;

    private static readonly HashSet<(string Table, string Column)> DeleteWhenMissing =
    [
        ("Budgets", "CategoryId"),
        ("Budgets", "TagId"),
    ];

    private readonly List<TableShape> shapes = BackupDatabase.ReadShapes(db);
    private readonly List<IReadOnlyList<string?>> pending = new(InsertBatchSize);
    private readonly List<(string Id, string Symbol, string Currency)> securities = [];
    private IDbContextTransaction? transaction;
    private string insertSql = "";
    private Rewrite[] rewrites = [];
    private string? currentTable;
    private int idColumn = -1;
    private int symbolColumn = -1;
    private int currencyColumn = -1;
    private int shaColumn = -1;

    private enum Rewrite
    {
        Keep,
        CurrentUser,
        Null,
        Personal,
        NoPriceSource,
    }

    public long Rows { get; private set; }

    public int Tables { get; private set; }

    public List<(Guid Id, string Sha256)> Attachments { get; } = [];

    private NpgsqlConnection Connection => (NpgsqlConnection)db.Database.GetDbConnection();

    public async Task BeginAsync(BackupHeader header, CancellationToken cancellationToken)
    {
        if (header is not { Format: UserExportService.Format, Version: UserExportService.Version })
        {
            throw new BackupFileException(ErrorCodes.ImportInvalidFile, "The file is not a Jx Finance data export.");
        }

        if (!string.Equals(header.Migration, BackupDatabase.CurrentMigration(db), StringComparison.Ordinal))
        {
            throw new BackupFileException(
                ErrorCodes.BackupSchemaMismatch,
                $"The export was taken at database version '{header.Migration}', but this application runs "
                + $"'{BackupDatabase.CurrentMigration(db)}'. Import it into the same application version.");
        }

        transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await BackupDatabase.ExecuteAsync(Connection, $"SET LOCAL lock_timeout = '{lockTimeoutSeconds}s'", cancellationToken);
        await BackupDatabase.SetForeignKeysAsync(Connection, shapes, "DEFERRABLE INITIALLY DEFERRED", cancellationToken);
        await ClearStartingDataAsync(cancellationToken);
    }

    public Task BeginTableAsync(string name, IReadOnlyList<string> columns, CancellationToken cancellationToken)
    {
        currentTable = Imported.Contains(name) ? name : null;
        if (currentTable is null)
        {
            return Task.CompletedTask;
        }

        var shape = shapes.Single(t => t.Name == name);
        var storeTypes = shape.Columns.ToDictionary(c => c.Name, c => c.StoreType, StringComparer.Ordinal);
        if (columns.Any(column => !storeTypes.ContainsKey(column)))
        {
            throw new BackupFileException("The tables in the export do not match this application.");
        }

        var names = string.Join(", ", columns.Select(BackupDatabase.Quote));
        var values = string.Join(", ", columns.Select((column, i) => $"CAST(${i + 1} AS {storeTypes[column]})"));
        var conflict = name == SecuritiesTable ? " ON CONFLICT DO NOTHING" : "";
        insertSql = $"INSERT INTO {shape.QuotedName} ({names}) VALUES ({values}){conflict}";
        var principals = db.Model.GetRelationalModel().FindTable(name, null)!.ForeignKeyConstraints
            .Where(f => f.Columns.Count == 1)
            .ToDictionary(f => f.Columns[0].Name, f => f.PrincipalTable.Name, StringComparer.Ordinal);
        rewrites = columns.Select(column => (principals.GetValueOrDefault(column), column) switch
        {
            (UsersTable, _) => Rewrite.CurrentUser,
            (HouseholdsTable, _) => Rewrite.Null,
            (_, "Scope") => Rewrite.Personal,
            (_, "PriceSource") when name == SecuritiesTable => Rewrite.NoPriceSource,
            (_, "PriceSymbol") when name == SecuritiesTable => Rewrite.Null,
            _ => Rewrite.Keep,
        }).ToArray();
        idColumn = IndexOf(columns, "Id");
        symbolColumn = name == SecuritiesTable ? IndexOf(columns, "Symbol") : -1;
        currencyColumn = name == SecuritiesTable ? IndexOf(columns, "Currency") : -1;
        shaColumn = name == AttachmentsTable ? IndexOf(columns, "Sha256") : -1;
        Tables++;
        return Task.CompletedTask;
    }

    public Task RowAsync(IReadOnlyList<string?> row, CancellationToken cancellationToken)
    {
        if (currentTable is null)
        {
            return Task.CompletedTask;
        }

        var rewritten = row.Select((value, i) => rewrites[i] switch
        {
            Rewrite.CurrentUser => userId.ToString(),
            Rewrite.Null => null,
            Rewrite.Personal => "0",
            Rewrite.NoPriceSource => nameof(PriceSource.None),
            _ => value,
        }).ToList();
        if (currentTable == SecuritiesTable && idColumn >= 0 && row[idColumn] is { } id)
        {
            securities.Add((id, row[symbolColumn] ?? "", row[currencyColumn] ?? ""));
        }

        if (currentTable == AttachmentsTable && idColumn >= 0 && shaColumn >= 0 && Guid.TryParse(row[idColumn], out var attachmentId))
        {
            Attachments.Add((attachmentId, row[shaColumn] ?? ""));
        }

        pending.Add(rewritten);
        Rows++;
        return pending.Count == InsertBatchSize ? FlushAsync(cancellationToken) : Task.CompletedTask;
    }

    public Task EndTableAsync(CancellationToken cancellationToken) => FlushAsync(cancellationToken);

    public async Task<int> RepairAsync(IReadOnlyCollection<Guid> attachmentsWithoutFile, CancellationToken cancellationToken)
    {
        await RemapSecuritiesAsync(cancellationToken);
        var removed = 0;
        if (attachmentsWithoutFile.Count > 0)
        {
            removed += await ExecuteAsync(
                $"DELETE FROM {BackupDatabase.Quote(AttachmentsTable)} WHERE {BackupDatabase.Quote("Id")} = ANY($1)",
                cancellationToken,
                new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Array | NpgsqlDbType.Uuid, Value = attachmentsWithoutFile.ToArray() });
        }

        var references = db.Model.GetRelationalModel().Tables
            .Where(t => Imported.Contains(t.Name))
            .SelectMany(t => t.ForeignKeyConstraints.Where(f => f.Columns.Count == 1).Select(f => (Table: t, Key: f)))
            .ToList();
        for (var pass = 0; pass < MaxRepairPasses; pass++)
        {
            var changed = 0;
            foreach (var (table, key) in references)
            {
                var column = key.Columns[0];
                var child = BackupDatabase.Quote(table.Name);
                var parent = BackupDatabase.Quote(key.PrincipalTable.Name);
                var fk = BackupDatabase.Quote(column.Name);
                var pk = BackupDatabase.Quote(key.PrincipalColumns[0].Name);
                var missing = $"{child}.{fk} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM {parent} WHERE {parent}.{pk} = {child}.{fk})";
                var nullable = column.IsNullable && !DeleteWhenMissing.Contains((table.Name, column.Name));
                changed += await ExecuteAsync(
                    nullable ? $"UPDATE {child} SET {fk} = NULL WHERE {missing}" : $"DELETE FROM {child} WHERE {missing}",
                    cancellationToken);
            }

            removed += changed;
            if (changed == 0)
            {
                break;
            }
        }

        return removed;
    }

    public async Task CompleteAsync(CancellationToken cancellationToken)
    {
        await BackupDatabase.ExecuteAsync(Connection, "SET CONSTRAINTS ALL IMMEDIATE", cancellationToken);
        await BackupDatabase.SetForeignKeysAsync(Connection, shapes, "NOT DEFERRABLE", cancellationToken);
        await transaction!.CommitAsync(cancellationToken);
    }

    public async ValueTask DisposeAsync()
    {
        if (transaction is not null)
        {
            await transaction.DisposeAsync();
        }
    }

    private async Task ClearStartingDataAsync(CancellationToken cancellationToken)
    {
        await ExecuteAsync(
            $"DELETE FROM {Q("NetWorthSnapshots")} WHERE {Q("UserId")} = $1",
            cancellationToken,
            new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Uuid, Value = userId });
        var referencing = db.Model.GetRelationalModel().Tables
            .SelectMany(t => t.ForeignKeyConstraints.Where(f => f.PrincipalTable.Name == CategoriesTable && f.Columns.Count == 1))
            .Select(f => (Table: f.Table.Name, Column: f.Columns[0].Name));
        var unused = string.Join(" AND ", referencing.Select(r =>
            $"NOT EXISTS (SELECT 1 FROM {Q(r.Table)} r WHERE r.{Q(r.Column)} = c.{Q("Id")})"));
        await ExecuteAsync(
            $"UPDATE {Q(CategoriesTable)} c SET {Q("IsDeleted")} = TRUE WHERE c.{Q("UserId")} = $1 AND NOT c.{Q("IsDeleted")} AND {unused}",
            cancellationToken,
            new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Uuid, Value = userId });
    }

    private async Task RemapSecuritiesAsync(CancellationToken cancellationToken)
    {
        foreach (var (id, symbol, currency) in securities)
        {
            await ExecuteAsync(
                $"UPDATE {Q("InvestmentTransactions")} SET {Q("SecurityId")} = "
                + $"(SELECT s.{Q("Id")} FROM {Q(SecuritiesTable)} s WHERE s.{Q("Symbol")} = $2 AND s.{Q("Currency")}::text = $3 LIMIT 1) "
                + $"WHERE {Q("SecurityId")}::text = $1 AND NOT EXISTS (SELECT 1 FROM {Q(SecuritiesTable)} WHERE {Q("Id")}::text = $1)",
                cancellationToken,
                new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Text, Value = id },
                new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Text, Value = symbol },
                new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Text, Value = currency });
        }
    }

    private async Task<int> ExecuteAsync(string sql, CancellationToken cancellationToken, params NpgsqlParameter[] parameters)
    {
        await using var command = new NpgsqlCommand(sql, Connection, (NpgsqlTransaction)transaction!.GetDbTransaction());
        command.Parameters.AddRange(parameters);
        return await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task FlushAsync(CancellationToken cancellationToken)
    {
        if (pending.Count == 0)
        {
            return;
        }

        await using var batch = new NpgsqlBatch(Connection, (NpgsqlTransaction)transaction!.GetDbTransaction());
        foreach (var row in pending)
        {
            var command = new NpgsqlBatchCommand(insertSql);
            foreach (var value in row)
            {
                command.Parameters.Add(new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Text, Value = (object?)value ?? DBNull.Value });
            }

            batch.BatchCommands.Add(command);
        }

        await batch.ExecuteNonQueryAsync(cancellationToken);
        pending.Clear();
    }

    private static string Q(string identifier) => BackupDatabase.Quote(identifier);

    private static int IndexOf(IReadOnlyList<string> columns, string name)
    {
        for (var i = 0; i < columns.Count; i++)
        {
            if (columns[i] == name)
            {
                return i;
            }
        }

        return -1;
    }
}
