using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.References;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Conversions.CreateConversion;
using JxFinance.Endpoints.Conversions.GetConversions;
using JxFinance.Endpoints.Conversions.Interfaces;
using JxFinance.Endpoints.Conversions.Mappers;
using JxFinance.Endpoints.Conversions.Shared;
using JxFinance.Endpoints.Conversions.UpdateConversion;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Conversions.Services;

[RegisterService<IConversionService>(LifeTime.Scoped)]
public sealed class ConversionService(
    AppDbContext db,
    ConversionMapper mapper,
    IExchangeRateService rates,
    IReferenceGuard references,
    IDeletionRecorder deletions) : IConversionService
{
    private static readonly DomainError FeeCategoryNotExpense =
        new(ErrorCodes.CategoryWrongType, "The fee category must be an expense category.");

    public async Task<PagedResponse<ConversionResponse>> GetPageAsync(
        GetConversionsRequest request,
        CancellationToken cancellationToken)
    {
        var query = db.CurrencyConversions.AsQueryable();
        if (request.AccountId is { } accountId)
        {
            var typedAccountId = new AccountId(accountId);
            query = query.Where(c => c.AccountId == typedAccountId);
        }

        var page = await query.ToPageAsync(
            request,
            sorted => sorted.OrderByDescending(c => c.Date).ThenByDescending(c => c.CreatedAt),
            cancellationToken);

        var feeIds = page.Items.Where(c => c.FeeTransactionId is not null).Select(c => c.FeeTransactionId!.Value).ToList();
        var fees = feeIds.Count == 0
            ? []
            : await db.Transactions.Where(t => feeIds.Contains(t.Id)).ToDictionaryAsync(t => t.Id, cancellationToken);

        return page.Map(c => mapper.FromEntity(c, FeeFor(c, fees)));
    }

    public async Task<Result<ConversionResponse>> CreateAsync(
        CreateConversionRequest request,
        CancellationToken cancellationToken)
    {
        var accountId = new AccountId(request.AccountId);
        if (await references.AccountExistsAsync(accountId, cancellationToken) is { } accountError)
        {
            return accountError;
        }

        if (rates.UnusableReason(request.FromCurrency, request.ToCurrency) is { } currencyError)
        {
            return new DomainError(ErrorCodes.CurrencyDisabled, currencyError);
        }

        Transaction? fee = null;
        if (request.FeeAmount is { } requestedFee)
        {
            var terms = await ResolveFeeAsync(
                new Money(requestedFee, request.FeeCurrency ?? request.FromCurrency),
                request.FeeCategoryId,
                request.Date,
                cancellationToken);
            if (terms.IsFailure)
            {
                return terms.Error;
            }

            fee = NewFee(accountId, terms.Value!, request.Date, FeeDescription(request.FromCurrency, request.ToCurrency));
            db.Transactions.Add(fee);
        }

        var conversion = mapper.ToEntity(request, fee);
        db.CurrencyConversions.Add(conversion);
        await db.SaveChangesAsync(cancellationToken);

        return mapper.FromEntity(conversion, fee);
    }

    public async Task<Result<ConversionResponse>> UpdateAsync(
        UpdateConversionRequest request,
        CancellationToken cancellationToken)
    {
        var conversionId = new CurrencyConversionId(request.Id);
        var conversion = await db.CurrencyConversions.FirstOrDefaultAsync(c => c.Id == conversionId, cancellationToken);
        if (conversion is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Conversion not found.");
        }

        if (conversion.ImportRef is not null)
        {
            return new DomainError(
                ErrorCodes.ResourceReadOnly,
                "This conversion was imported from a broker. Correct it there and import again.");
        }

        var newCurrencies = new[] { request.FromCurrency, request.ToCurrency }
            .Except([conversion.FromAmount.Currency, conversion.ToAmount.Currency])
            .ToArray();
        if (rates.UnusableReason(newCurrencies) is { } currencyError)
        {
            return new DomainError(ErrorCodes.CurrencyDisabled, currencyError);
        }

        var fee = conversion.FeeTransactionId is { } feeId
            ? await db.Transactions.FirstOrDefaultAsync(t => t.Id == feeId, cancellationToken)
            : null;
        Money? requestedFee = request.FeeAmount is { } amount
            ? new Money(amount, request.FeeCurrency ?? request.FromCurrency)
            : null;
        if (fee is { IsSplit: true } && (requestedFee != fee.Amount || request.Date != fee.Date))
        {
            return new DomainError(
                ErrorCodes.TransactionSplitNotAllowed,
                "The fee transaction is split into lines. Edit that transaction instead.");
        }

        var previousDescription = FeeDescription(conversion.FromAmount.Currency, conversion.ToAmount.Currency);
        var description = FeeDescription(request.FromCurrency, request.ToCurrency);
        if (requestedFee is { } feeAmount)
        {
            var terms = await ResolveFeeAsync(feeAmount, request.FeeCategoryId, request.Date, cancellationToken);
            if (terms.IsFailure)
            {
                return terms.Error;
            }

            if (fee is null)
            {
                fee = NewFee(conversion.AccountId, terms.Value!, request.Date, description);
                db.Transactions.Add(fee);
            }
            else if (!fee.IsSplit)
            {
                fee.Amount = terms.Value!.Amount;
                fee.ReportingAmount = terms.Value.ReportingAmount;
                fee.CategoryId = terms.Value.CategoryId;
                fee.Date = request.Date;
                if (fee.Description == previousDescription)
                {
                    fee.Description = description;
                }
            }
        }
        else if (fee is not null)
        {
            db.Transactions.Remove(fee);
            fee = null;
        }

        conversion.FromAmount = new Money(request.FromAmount, request.FromCurrency);
        conversion.ToAmount = new Money(request.ToAmount, request.ToCurrency);
        conversion.Date = request.Date;
        conversion.Description = OptionalText.Normalize(request.Description);
        conversion.FeeTransactionId = fee?.Id;
        await db.SaveChangesAsync(cancellationToken);

        return mapper.FromEntity(conversion, fee);
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var conversionId = new CurrencyConversionId(id);
        var conversion = await db.CurrencyConversions.FirstOrDefaultAsync(c => c.Id == conversionId, cancellationToken);
        if (conversion is null)
        {
            return new DomainError(ErrorCodes.ResourceNotFound, "Conversion not found.");
        }

        Transaction? fee = null;
        if (conversion.FeeTransactionId is { } feeId)
        {
            fee = await db.Transactions.FirstOrDefaultAsync(t => t.Id == feeId, cancellationToken);
            if (fee is not null)
            {
                db.Transactions.Remove(fee);
                conversion.FeeTransactionId = feeId;
            }
        }

        deletions.Record(
            TrashKind.Conversion,
            id,
            TrashLabel.Exchanged(conversion.FromAmount, conversion.ToAmount, conversion.Date),
            fee?.Id.Value);

        db.CurrencyConversions.Remove(conversion);
        await db.SaveChangesAsync(cancellationToken);

        return id;
    }

    private static Transaction? FeeFor(CurrencyConversion conversion, Dictionary<TransactionId, Transaction> fees) =>
        conversion.FeeTransactionId is { } feeId ? fees.GetValueOrDefault(feeId) : null;

    private static string FeeDescription(Currency from, Currency to) => $"Conversion fee {from.ToCode()} to {to.ToCode()}";

    private static Transaction NewFee(AccountId accountId, FeeTerms terms, DateOnly date, string description) => new()
    {
        AccountId = accountId,
        CategoryId = terms.CategoryId,
        Type = FlowType.Expense,
        Amount = terms.Amount,
        ReportingAmount = terms.ReportingAmount,
        Date = date,
        Description = description,
        Source = TransactionSource.Manual,
    };

    private async Task<Result<FeeTerms>> ResolveFeeAsync(
        Money amount,
        Guid? categoryId,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        CategoryId? feeCategoryId = categoryId is { } id ? new CategoryId(id) : null;
        if (feeCategoryId is { } feeCategory
            && await references.CategoryOfTypeAsync(feeCategory, FlowType.Expense, FeeCategoryNotExpense, cancellationToken) is { } categoryError)
        {
            return categoryError;
        }

        var reporting = await rates.ToReportingAsync(amount, date, cancellationToken);
        return reporting.IsFailure
            ? reporting.Error
            : new FeeTerms(amount, feeCategoryId, reporting.Value);
    }

    private sealed record FeeTerms(Money Amount, CategoryId? CategoryId, decimal ReportingAmount);
}
