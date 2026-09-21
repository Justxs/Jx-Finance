using JxFinance.Domain.Email;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace JxFinance.Endpoints.Backups.Services;

public static class BackupDatabase
{
    public static List<TableShape> ReadShapes(AppDbContext db)
    {
        string?[] transient =
        [
            db.Model.FindEntityType(typeof(UserSession))!.GetTableName(),
            db.Model.FindEntityType(typeof(EmailMessage))!.GetTableName(),
        ];

        return db.Model.GetRelationalModel().Tables
            .OrderBy(t => t.Name, StringComparer.Ordinal)
            .Select(t => new TableShape(
                t.Name,
                t.Schema is null ? Quote(t.Name) : $"{Quote(t.Schema)}.{Quote(t.Name)}",
                t.Columns.Select(c => new ColumnShape(c.Name, c.StoreType)).ToList(),
                t.ForeignKeyConstraints.Select(f => f.Name).ToList(),
                !transient.Contains(t.Name, StringComparer.Ordinal)))
            .ToList();
    }

    public static async Task SetForeignKeysAsync(
        NpgsqlConnection connection,
        IReadOnlyList<TableShape> shapes,
        string mode,
        CancellationToken cancellationToken)
    {
        foreach (var table in shapes)
        {
            foreach (var foreignKey in table.ForeignKeys)
            {
                await ExecuteAsync(
                    connection,
                    $"ALTER TABLE {table.QuotedName} ALTER CONSTRAINT {Quote(foreignKey)} {mode}",
                    cancellationToken);
            }
        }
    }

    public static async Task ResetSequencesAsync(
        NpgsqlConnection connection,
        IReadOnlyList<TableShape> shapes,
        CancellationToken cancellationToken)
    {
        var generated = new List<(string Table, string Column)>();
        await using (var command = new NpgsqlCommand(
            "SELECT table_name, column_name FROM information_schema.columns "
            + "WHERE table_schema = current_schema() AND (is_identity = 'YES' OR column_default LIKE 'nextval(%')",
            connection))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                generated.Add((reader.GetString(0), reader.GetString(1)));
            }
        }

        foreach (var (tableName, column) in generated)
        {
            var table = shapes.FirstOrDefault(t => t.Name == tableName);
            if (table is null) continue;

            await using var command = new NpgsqlCommand(
                $"SELECT setval(pg_get_serial_sequence($1, $2), COALESCE(MAX({Quote(column)}), 1), MAX({Quote(column)}) IS NOT NULL) "
                + $"FROM {table.QuotedName}",
                connection);
            command.Parameters.Add(new NpgsqlParameter { Value = table.QuotedName });
            command.Parameters.Add(new NpgsqlParameter { Value = column });
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    public static async Task ExecuteAsync(NpgsqlConnection connection, string sql, CancellationToken cancellationToken)
    {
        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public static string Quote(string identifier) => $"\"{identifier.Replace("\"", "\"\"")}\"";
}

public sealed record TableShape(
    string Name,
    string QuotedName,
    IReadOnlyList<ColumnShape> Columns,
    IReadOnlyList<string> ForeignKeys,
    bool Exported);

public sealed record ColumnShape(string Name, string StoreType);
