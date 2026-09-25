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
    IExchangeRateService rates,
    ITransactionValuation valuations,
    IReferenceGuard references,
    IDeletionRecorder deletions) : IConversionService
{
    private static readonly DomainError FeeCategoryNotExpense =
        new(ErrorCodes.CategoryWrongType, "The fee category must be an expense category.");

    public async Task<PagedResponse<ConversionResponse>> GetPageAsync(
        GetConversionsRequest request,
        CancellationToken cancellationToken)
    {
        var query = db.CurrencyConversions.AsNoTracking();
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
            : await db.Transactions
                .AsNoTracking()
                .Where(t => feeIds.Contains(t.Id))
                .Select(t => new ConversionFee(t.Id, t.Amount, t.CategoryId))
                .ToDictionaryAsync(fee => fee.Id, cancellationToken);

        return page.Map(c => c.ToResponse(FeeFor(c, fees)));
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
                accountId,
                new Money(requestedFee, request.FeeCurrency ?? request.FromCurrency),
                request.FeeCategoryId,
                request.Date,
                [],
                cancellationToken);
            if (!terms.TryGetValue(out var feeTerms))
            {
                return terms.Error;
            }

            fee = NewFee(accountId, feeTerms, request.Date, FeeDescription(request.FromCurrency, request.ToCurrency));
            db.Transactions.Add(fee);
        }

        var conversion = request.ToEntity(fee);
        db.CurrencyConversions.Add(conversion);
        await db.SaveChangesAsync(cancellationToken);

        return conversion.ToResponse(fee);
    }

    public async Task<Result<ConversionResponse>> UpdateAsync(
        UpdateConversionRequest request,
        CancellationToken cancellationToken)
    {
        var conversionId = new CurrencyConversionId(request.Id);
        var found = await db.CurrencyConversions.FindOrNotFoundAsync(c => c.Id == conversionId, "Conversion not found.", cancellationToken);
        if (!found.TryGetValue(out var conversion))
        {
            return found.Error;
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
            var terms = await ResolveFeeAsync(
                conversion.AccountId,
                feeAmount,
                request.FeeCategoryId,
                request.Date,
                [conversion.FromAmount.Currency, conversion.ToAmount.Currency],
                cancellationToken);
            if (!terms.TryGetValue(out var feeTerms))
            {
                return terms.Error;
            }

            if (fee is null)
            {
                fee = NewFee(conversion.AccountId, feeTerms, request.Date, description);
                db.Transactions.Add(fee);
            }
            else if (!fee.IsSplit)
            {
                fee.Amount = feeTerms.Amount;
                fee.ReportingAmount = feeTerms.ReportingAmount;
                fee.CategoryId = feeTerms.CategoryId;
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

        request.ApplyTo(conversion, fee);
        await db.SaveChangesAsync(cancellationToken);

        return conversion.ToResponse(fee);
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var conversionId = new CurrencyConversionId(id);
        var found = await db.CurrencyConversions.FindOrNotFoundAsync(c => c.Id == conversionId, "Conversion not found.", cancellationToken);
        if (!found.TryGetValue(out var conversion))
        {
            return found.Error;
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

    private static ConversionFee? FeeFor(CurrencyConversion conversion, Dictionary<TransactionId, ConversionFee> fees) =>
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
        AccountId accountId,
        Money amount,
        Guid? categoryId,
        DateOnly date,
        IReadOnlyCollection<Currency> currenciesInUse,
        CancellationToken cancellationToken)
    {
        CategoryId? feeCategoryId = categoryId is { } id ? new CategoryId(id) : null;
        if (feeCategoryId is { } feeCategory
            && await references.CategoryOfTypeAsync(feeCategory, FlowType.Expense, FeeCategoryNotExpense, cancellationToken) is { } categoryError)
        {
            return categoryError;
        }

        var value = await valuations.ValueAsync(accountId, amount.Amount, amount.Currency, date, currenciesInUse, cancellationToken);
        return value.Map(valued => new FeeTerms(valued.Amount, feeCategoryId, valued.ReportingAmount));
    }

    private sealed record FeeTerms(Money Amount, CategoryId? CategoryId, decimal ReportingAmount);
}
