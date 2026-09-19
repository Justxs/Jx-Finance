using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Endpoints.Investments.SaveSecurity;
using JxFinance.Endpoints.Investments.Shared;

namespace JxFinance.Endpoints.Investments.Mappers;

[RegisterService<InvestmentMapper>(LifeTime.Singleton)]
public sealed class InvestmentMapper
{
    public InvestmentTransaction ToEntity(IInvestmentTransactionInput request, Currency currency)
    {
        var quantity = request.Quantity is null ? 0m : QuantityWire.Parse(request.Quantity);
        var price = request.Price is null ? 0m : QuantityWire.Parse(request.Price);
        var amount = request.Amount is null ? 0m : MoneyWire.Parse(request.Amount, currency).Amount;
        var fee = request.Fee is null ? 0m : MoneyWire.Parse(request.Fee, currency).Amount;
        var isTrade = request.Type is InvestmentTransactionType.Buy or InvestmentTransactionType.Sell;

        return new InvestmentTransaction
        {
            AccountId = new AccountId(request.AccountId),
            SecurityId = request.SecurityId is { } id ? new SecurityId(id) : null,
            Type = request.Type,
            Date = request.Date,
            Quantity = quantity,
            Price = price,
            Fee = isTrade ? fee : 0m,
            CashAmount = new Money(Portfolio.CashEffect(request.Type, quantity, price, amount, fee), currency),
            Description = OptionalText.Normalize(request.Description),
            Source = InvestmentSource.Manual,
        };
    }

    public InvestmentTransactionResponse FromEntity(InvestmentTransaction transaction, string? symbol) => new(
        transaction.Id.Value,
        transaction.AccountId.Value,
        transaction.SecurityId?.Value,
        symbol,
        transaction.Type,
        transaction.Date,
        QuantityWire.ToWire(transaction.Quantity),
        QuantityWire.ToWire(transaction.Price),
        MoneyWire.ToWire(new Money(transaction.Fee, transaction.CashAmount.Currency)),
        MoneyWire.ToWire(transaction.CashAmount),
        transaction.CashAmount.Currency,
        transaction.Description,
        transaction.Source,
        transaction.CreatedAt);

    public SecurityResponse FromEntity(Security security) => new(
        security.Id.Value,
        security.Symbol,
        security.Name,
        security.Isin,
        security.Exchange,
        security.Type,
        security.Currency,
        security.LastPrice is { } price ? QuantityWire.ToWire(price) : null,
        security.LastPriceDate);

    public void Apply(SaveSecurityRequest request, string symbol, Security security, DateOnly today)
    {
        security.Symbol = symbol;
        security.Name = request.Name.Trim();
        security.Isin = OptionalText.Normalize(request.Isin)?.ToUpperInvariant();
        security.Exchange = OptionalText.Normalize(request.Exchange)?.ToUpperInvariant();
        security.Type = request.Type;
        security.Currency = request.Currency;
        if (request.LastPrice is not null)
        {
            security.LastPrice = QuantityWire.Parse(request.LastPrice);
            security.LastPriceDate = request.LastPriceDate ?? today;
        }
    }

    public HoldingResponse ToHolding(
        AccountId accountId,
        Security security,
        Position position,
        decimal? marketValue,
        decimal? marketValueReporting,
        decimal realizedGain,
        decimal dividends)
    {
        string Wire(decimal amount) => MoneyWire.ToWire(new Money(amount, security.Currency));
        var unrealized = marketValue - position.CostBasis;

        return new HoldingResponse(
            accountId.Value,
            FromEntity(security),
            QuantityWire.ToWire(position.Quantity),
            QuantityWire.ToWire(position.Quantity == 0m ? 0m : decimal.Round(position.CostBasis / position.Quantity, 4)),
            Wire(position.CostBasis),
            marketValue is { } value ? Wire(value) : null,
            unrealized is { } gain ? Wire(gain) : null,
            unrealized is { } change && position.CostBasis != 0m
                ? QuantityWire.ToWire(decimal.Round(change / position.CostBasis * 100m, 2))
                : null,
            marketValueReporting is { } reporting ? MoneyWire.ToWire(new Money(reporting)) : null,
            Wire(realizedGain),
            Wire(dividends));
    }
}
