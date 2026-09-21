using System.Security.Cryptography;
using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Endpoints.Investments.Interfaces;
using JxFinance.Endpoints.Investments.SaveBrokerConnection;
using JxFinance.Endpoints.Investments.Shared;
using JxFinance.Infrastructure.Brokers.InteractiveBrokers;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace JxFinance.Endpoints.Investments.Services;

[RegisterService<IBrokerImportService>(LifeTime.Scoped)]
public sealed class BrokerImportService(
    AppDbContext db,
    IExchangeRateService rates,
    IFlexClient flex,
    IDataProtectionProvider protection,
    IClock clock,
    ICurrentUser currentUser) : IBrokerImportService
{
    private const int MaxErrorLength = 500;
    private const int MaxImportAttempts = 3;

    private IDataProtector Protector => protection.CreateProtector("JxFinance.BrokerConnection.Token");

    public async Task<Result<BrokerImportResponse>> ImportAsync(
        Guid accountId,
        Guid? fundingAccountId,
        Stream report,
        CancellationToken cancellationToken)
    {
        var parsed = await FlexParser.ParseAsync(report, cancellationToken);
        if (parsed.IsFailure)
        {
            return parsed.Error;
        }

        var statement = parsed.Value!;
        if (statement.BrokerAccounts.Count > 1)
        {
            return new DomainError(
                ErrorCodes.ImportInvalidFile,
                "The report covers several Interactive Brokers accounts. Create a Flex Query for one account.");
        }

        var account = new AccountId(accountId);
        AccountId? funding = fundingAccountId is { } id ? new AccountId(id) : null;
        if (await AccountErrorAsync(account, funding, cancellationToken) is { } accountError)
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, accountError);
        }

        var currencies = statement.Trades.SelectMany(t => new[] { t.Instrument.Currency, t.CommissionCurrency })
            .Concat(statement.CashTransactions.Select(c => c.Currency))
            .Distinct()
            .ToArray();
        if (rates.UnusableReason(currencies) is { } currencyError)
        {
            return new DomainError(ErrorCodes.CurrencyDisabled, currencyError);
        }

        var foreignDates = statement.Trades.Where(t => t.Instrument.Currency != rates.ReportingCurrency || t.CommissionCurrency != rates.ReportingCurrency)
            .Select(t => t.Date)
            .Concat(statement.CashTransactions.Where(c => c.Currency != rates.ReportingCurrency).Select(c => c.Date))
            .ToList();
        if (foreignDates.Count > 0)
        {
            await rates.EnsureRangeAsync(foreignDates.Min(), foreignDates.Max(), cancellationToken);
        }

        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await new StatementImport(db, rates, statement, account, funding).RunAsync(cancellationToken);
            }
            catch (DbUpdateException ex) when (IsSecurityCollision(ex))
            {
                db.ChangeTracker.Clear();
                if (attempt >= MaxImportAttempts)
                {
                    return new DomainError(
                        ErrorCodes.ConflictBusy,
                        "A security in the report collides with an existing one. Try the import again.");
                }
            }
        }
    }

    private static bool IsSecurityCollision(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            TableName: "Securities" or "SecurityPrices",
        };

    public async Task<IReadOnlyList<BrokerConnectionResponse>> GetConnectionsAsync(CancellationToken cancellationToken)
    {
        var connections = await db.BrokerConnections.OrderBy(c => c.CreatedAt).ToListAsync(cancellationToken);
        return connections.Select(ToResponse).ToList();
    }

    public async Task<Result<BrokerConnectionResponse>> SaveConnectionAsync(
        SaveBrokerConnectionRequest request,
        CancellationToken cancellationToken)
    {
        var account = new AccountId(request.AccountId);
        AccountId? funding = request.FundingAccountId is { } id ? new AccountId(id) : null;
        if (await AccountErrorAsync(account, funding, cancellationToken) is { } accountError)
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, accountError);
        }

        if (!await db.Accounts.AnyAsync(a => a.Id == account && a.UserId == currentUser.Id, cancellationToken))
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Only the account's owner can connect it to a broker.");
        }

        var connection = await db.BrokerConnections.FirstOrDefaultAsync(c => c.AccountId == account, cancellationToken);
        if (connection is null)
        {
            if (string.IsNullOrEmpty(request.Token))
            {
                return new DomainError(ErrorCodes.BrokerTokenRequired, "Enter the Flex Web Service token.");
            }

            connection = new BrokerConnection { AccountId = account };
            db.BrokerConnections.Add(connection);
        }

        connection.QueryId = request.QueryId;
        connection.FundingAccountId = funding;
        connection.IsEnabled = request.IsEnabled;
        if (!string.IsNullOrEmpty(request.Token))
        {
            connection.ProtectedToken = Protector.Protect(request.Token);
        }

        await db.SaveChangesAsync(cancellationToken);
        return ToResponse(connection);
    }

    public async Task<Result<Guid>> DeleteConnectionAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var account = new AccountId(accountId);
        var connection = await db.BrokerConnections.FirstOrDefaultAsync(c => c.AccountId == account, cancellationToken);
        if (connection is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Connection not found.");
        }

        connection.ProtectedToken = string.Empty;
        db.BrokerConnections.Remove(connection);
        await db.SaveChangesAsync(cancellationToken);

        return accountId;
    }

    public async Task<Result<BrokerImportResponse>> SyncAsync(Guid accountId, CancellationToken cancellationToken)
    {
        var account = new AccountId(accountId);
        var connection = await db.BrokerConnections.FirstOrDefaultAsync(c => c.AccountId == account, cancellationToken);
        if (connection is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Connection not found.");
        }

        Result<BrokerImportResponse> result;
        try
        {
            result = await DownloadAndImportAsync(connection, cancellationToken);
        }
        catch (Exception ex) when (ex is DbUpdateException or InvalidOperationException)
        {
            result = new DomainError(ErrorCodes.BrokerUnavailable, "The report could not be imported.");
        }

        db.ChangeTracker.Clear();
        db.Attach(connection);
        connection.LastSyncAt = clock.UtcNow;
        connection.LastError = result.ErrorMessage is { Length: > MaxErrorLength } message ? message[..MaxErrorLength] : result.ErrorMessage;
        await db.SaveChangesAsync(cancellationToken);

        return result;
    }

    private async Task<Result<BrokerImportResponse>> DownloadAndImportAsync(
        BrokerConnection connection,
        CancellationToken cancellationToken)
    {
        string token;
        try
        {
            token = Protector.Unprotect(connection.ProtectedToken);
        }
        catch (CryptographicException)
        {
            return new DomainError(ErrorCodes.BrokerTokenRequired, "The stored token can no longer be read. Enter it again.");
        }

        var report = await flex.DownloadAsync(token, connection.QueryId, cancellationToken);
        if (report.IsFailure)
        {
            return report.Error;
        }

        await using var stream = report.Value!;
        return await ImportAsync(connection.AccountId.Value, connection.FundingAccountId?.Value, stream, cancellationToken);
    }

    private async Task<string?> AccountErrorAsync(AccountId account, AccountId? funding, CancellationToken cancellationToken)
    {
        var wanted = funding is null ? new[] { account } : [account, funding.Value];
        return funding != account && await db.Accounts.CountAsync(a => wanted.Contains(a.Id), cancellationToken) == wanted.Length
            ? null
            : "Choose accounts you can access, and a different funding account.";
    }

    private static BrokerConnectionResponse ToResponse(BrokerConnection connection) => new(
        connection.AccountId.Value,
        connection.FundingAccountId?.Value,
        connection.QueryId,
        connection.IsEnabled,
        connection.LastSyncAt,
        connection.LastError);
}
