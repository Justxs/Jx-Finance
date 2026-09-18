using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Conversions.CreateConversion;
using JxFinance.Endpoints.Conversions.GetConversions;
using JxFinance.Endpoints.Conversions.Interfaces;
using JxFinance.Endpoints.Conversions.Mappers;
using JxFinance.Endpoints.Conversions.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Conversions.Services;

[RegisterService<IConversionService>(LifeTime.Scoped)]
public sealed class ConversionService(AppDbContext db, ConversionMapper mapper, IExchangeRateService rates)
    : IConversionService
{
    public async Task<PagedResponse<ConversionResponse>> GetPageAsync(
        GetConversionsRequest request,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(request.Page, 1);
        var pageSize = Math.Clamp(request.PageSize, 1, 200);

        var query = db.CurrencyConversions.AsQueryable();
        if (request.AccountId is { } accountId)
        {
            var typedAccountId = new AccountId(accountId);
            query = query.Where(c => c.AccountId == typedAccountId);
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(c => c.Date)
            .ThenByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var feeIds = items.Where(c => c.FeeTransactionId is not null).Select(c => c.FeeTransactionId!.Value).ToList();
        var fees = feeIds.Count == 0
            ? []
            : await db.Transactions.Where(t => feeIds.Contains(t.Id)).ToDictionaryAsync(t => t.Id, cancellationToken);

        return new PagedResponse<ConversionResponse>(
            items.Select(c => mapper.FromEntity(c, FeeFor(c, fees))).ToList(),
            page,
            pageSize,
            total);
    }

    public async Task<Result<ConversionResponse>> CreateAsync(
        CreateConversionRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = new AccountId(request.AccountId);
        if (!await db.Accounts.AnyAsync(a => a.Id == accountId, cancellationToken))
        {
            return Result<ConversionResponse>.Failure(ErrorCodes.Validation, "Account does not exist.");
        }

        if (rates.UnusableReason(request.FromCurrency, request.ToCurrency) is { } currencyError)
        {
            return Result<ConversionResponse>.Failure(ErrorCodes.Validation, currencyError);
        }

        Transaction? fee = null;
        if (request.FeeAmount is not null)
        {
            CategoryId? feeCategoryId = request.FeeCategoryId is { } id ? new CategoryId(id) : null;
            if (feeCategoryId is not null && !await db.Categories.AnyAsync(
                    c => c.Id == feeCategoryId && c.Type == FlowType.Expense,
                    cancellationToken))
            {
                return Result<ConversionResponse>.Failure(ErrorCodes.Validation, "The fee category must be an expense category.");
            }

            var feeAmount = MoneyWire.Parse(request.FeeAmount, request.FeeCurrency ?? request.FromCurrency);
            var reporting = await rates.ToReportingAsync(feeAmount, request.Date, cancellationToken);
            if (reporting.IsFailure)
            {
                return Result<ConversionResponse>.FailureFrom(reporting);
            }

            fee = new Transaction
            {
                AccountId = accountId,
                CategoryId = feeCategoryId,
                Type = FlowType.Expense,
                Amount = feeAmount,
                ReportingAmount = reporting.Value,
                Date = request.Date,
                Description = $"Conversion fee {request.FromCurrency.ToCode()} to {request.ToCurrency.ToCode()}",
                Source = TransactionSource.Manual,
            };
            db.Transactions.Add(fee);
        }

        var conversion = mapper.ToEntity(request, fee);
        db.CurrencyConversions.Add(conversion);
        await db.SaveChangesAsync(cancellationToken);

        return Result<ConversionResponse>.Success(mapper.FromEntity(conversion, fee));
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var conversionId = new CurrencyConversionId(id);
        var conversion = await db.CurrencyConversions.FirstOrDefaultAsync(c => c.Id == conversionId, cancellationToken);
        if (conversion is null)
        {
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Conversion not found.");
        }

        if (conversion.FeeTransactionId is { } feeId)
        {
            var fee = await db.Transactions.FirstOrDefaultAsync(t => t.Id == feeId, cancellationToken);
            if (fee is not null)
            {
                db.Transactions.Remove(fee);
            }
        }

        db.CurrencyConversions.Remove(conversion);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    private static Transaction? FeeFor(CurrencyConversion conversion, Dictionary<TransactionId, Transaction> fees) =>
        conversion.FeeTransactionId is { } feeId ? fees.GetValueOrDefault(feeId) : null;
}
