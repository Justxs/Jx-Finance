using JxFinance.Common;
using JxFinance.Common.ExchangeRates;
using JxFinance.Common.Transfers;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Infrastructure.Brokers.InteractiveBrokers;
using JxFinance.Infrastructure.Data;

namespace JxFinance.Endpoints.Investments.Services;

internal sealed class StatementEntries(
    AppDbContext db,
    IExchangeRateService rates,
    ITransferAmountResolver transfers,
    AccountId account,
    InvestmentSource source)
{
    private const int MaxDescriptionLength = 500;

    public async Task<DomainError?> AddEntryAsync(
        string reference,
        InvestmentTransactionType type,
        Security? security,
        DateOnly date,
        Money cash,
        string? description,
        CancellationToken cancellationToken,
        decimal quantity = 0m,
        decimal price = 0m,
        decimal fee = 0m,
        Security? related = null,
        decimal relatedQuantity = 0m,
        decimal? costShare = null)
    {
        var reporting = await rates.ToReportingAsync(cash, date, cancellationToken);
        if (reporting.IsFailure)
        {
            return reporting.Error;
        }

        AddEntry(reference, type, security, date, cash, reporting.Value, description, quantity, price, fee, related, relatedQuantity, costShare);
        return null;
    }

    public void AddEntry(
        string reference,
        InvestmentTransactionType type,
        Security? security,
        DateOnly date,
        Money cash,
        decimal reportingAmount,
        string? description,
        decimal quantity = 0m,
        decimal price = 0m,
        decimal fee = 0m,
        Security? related = null,
        decimal relatedQuantity = 0m,
        decimal? costShare = null)
    {
        db.InvestmentTransactions.Add(new InvestmentTransaction
        {
            AccountId = account,
            SecurityId = security?.Id,
            RelatedSecurityId = related?.Id,
            Type = type,
            Date = date,
            Quantity = quantity,
            RelatedQuantity = relatedQuantity,
            CostShare = costShare,
            Price = price,
            Fee = fee,
            CashAmount = cash,
            ReportingAmount = reportingAmount,
            Description = TextLimit.Ellipsize(description, MaxDescriptionLength),
            Source = source,
            ExternalId = reference,
        });
    }

    public async Task<DomainError?> AddTransferAsync(
        string reference,
        FlexCashTransaction entry,
        (AccountId Account, Currency Currency) funding,
        CancellationToken cancellationToken)
    {
        var (fundingAccount, fundingCurrency) = funding;
        var atBroker = new Money(Math.Abs(entry.Amount), entry.Currency);
        var atFunding = await rates.ConvertAsync(atBroker, fundingCurrency, entry.Date, cancellationToken);
        if (atFunding.IsFailure)
        {
            return atFunding.Error;
        }

        var draft = entry.Amount > 0
            ? new TransferDraft(fundingAccount, account, atFunding.Value, fundingCurrency, atBroker.Amount, atBroker.Currency)
            : new TransferDraft(account, fundingAccount, atBroker.Amount, atBroker.Currency, atFunding.Value, fundingCurrency);
        var amounts = await transfers.ResolveAsync(draft, [atBroker.Currency, fundingCurrency], cancellationToken);
        if (amounts.IsFailure)
        {
            return amounts.Error;
        }

        var transfer = new Transfer
        {
            FromAccountId = draft.FromAccountId,
            ToAccountId = draft.ToAccountId,
            Amount = amounts.Value!.Sent,
            ReceivedAmount = amounts.Value.Received,
            Date = entry.Date,
            Description = TextLimit.Ellipsize(entry.Description, MaxDescriptionLength),
        };
        db.Transfers.Add(transfer);
        db.TransferImports.Add(new TransferImport { AccountId = account, ImportRef = reference, TransferId = transfer.Id });
        return null;
    }

    public async Task<DomainError?> AddConversionAsync(
        string reference,
        FlexTrade trade,
        Currency baseCurrency,
        CancellationToken cancellationToken)
    {
        var inBase = new Money(Math.Abs(trade.Quantity), baseCurrency);
        var inQuote = new Money(Math.Abs(trade.Proceeds), trade.Instrument.Currency);

        Transaction? fee = null;
        if (trade.Commission < 0m)
        {
            var amount = new Money(-trade.Commission, trade.CommissionCurrency);
            var reporting = await rates.ToReportingAsync(amount, trade.Date, cancellationToken);
            if (reporting.IsFailure)
            {
                return reporting.Error;
            }

            fee = new Transaction
            {
                AccountId = account,
                Type = FlowType.Expense,
                Amount = amount,
                ReportingAmount = reporting.Value,
                Date = trade.Date,
                Description = $"Conversion fee {trade.Instrument.Symbol}",
                Source = TransactionSource.Imported,
            };
            db.Transactions.Add(fee);
        }

        db.CurrencyConversions.Add(new CurrencyConversion
        {
            AccountId = account,
            FromAmount = trade.IsBuy ? inQuote : inBase,
            ToAmount = trade.IsBuy ? inBase : inQuote,
            Date = trade.Date,
            FeeTransactionId = fee?.Id,
            ImportRef = reference,
        });
        return null;
    }
}
