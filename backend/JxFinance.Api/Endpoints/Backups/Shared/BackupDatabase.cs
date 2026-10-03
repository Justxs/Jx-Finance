using System.Text.Json;
using JxFinance.Domain.Email;
using JxFinance.Domain.Imports;
using JxFinance.Domain.Notifications;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace JxFinance.Endpoints.Backups.Shared;

public static class BackupDatabase
{
    private const int FlushEveryRows = 1000;

    public static string CurrentMigration(AppDbContext db) => db.Database.GetMigrations().LastOrDefault() ?? "";

    public static List<TableShape> ReadShapes(AppDbContext db)
    {
        string?[] transient =
        [
            db.Model.FindEntityType(typeof(UserSession))!.GetTableName(),
            db.Model.FindEntityType(typeof(PersonalApiToken))!.GetTableName(),
            db.Model.FindEntityType(typeof(ApiIdempotencyKey))!.GetTableName(),
            db.Model.FindEntityType(typeof(EmailMessage))!.GetTableName(),
            db.Model.FindEntityType(typeof(DiscordMessage))!.GetTableName(),
            db.Model.FindEntityType(typeof(ImportInboxFile))!.GetTableName(),
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

    public static async Task<long> WriteTableAsync(
        NpgsqlConnection connection,
        TableShape table,
        Utf8JsonWriter json,
        string? condition,
        NpgsqlParameter[] parameters,
        CancellationToken cancellationToken)
    {
        json.WriteStartObject();
        json.WriteString(BackupJsonNames.Name, table.Name);
        json.WriteStartArray(BackupJsonNames.Columns);
        foreach (var column in table.Columns) json.WriteStringValue(column.Name);
        json.WriteEndArray();
        json.WriteStartArray(BackupJsonNames.Rows);

        var columns = string.Join(", ", table.Columns.Select(c => $"{Quote(c.Name)}::text"));
        var where = condition is null ? "" : $" WHERE {condition}";
        await using var command = new NpgsqlCommand($"SELECT {columns} FROM {table.QuotedName}{where}", connection);
        command.Parameters.AddRange(parameters);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        long written = 0;
        while (await reader.ReadAsync(cancellationToken))
        {
            json.WriteStartArray();
            for (var i = 0; i < reader.FieldCount; i++)
            {
                if (reader.IsDBNull(i)) json.WriteNullValue();
                else json.WriteStringValue(reader.GetString(i));
            }

            json.WriteEndArray();
            if (++written % FlushEveryRows == 0)
            {
                await json.FlushAsync(cancellationToken);
            }
        }

        json.WriteEndArray();
        json.WriteEndObject();
        return written;
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
