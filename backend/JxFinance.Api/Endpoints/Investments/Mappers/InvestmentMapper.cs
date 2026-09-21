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
        var quantity = request.Quantity ?? 0m;
        var price = request.Price ?? 0m;
        var amount = request.Amount ?? 0m;
        var fee = request.Fee ?? 0m;
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
        transaction.Quantity,
        transaction.Price,
        transaction.Fee,
        transaction.CashAmount.Amount,
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
        security.LastPrice,
        security.LastPriceDate);

    public SecurityPriceResponse FromEntity(SecurityPrice price) => new(price.Date, price.Price);

    public void Apply(SaveSecurityRequest request, string symbol, Security security)
    {
        security.Symbol = symbol;
        security.Name = request.Name.Trim();
        security.Isin = OptionalText.Normalize(request.Isin)?.ToUpperInvariant();
        security.Exchange = OptionalText.Normalize(request.Exchange)?.ToUpperInvariant();
        security.Type = request.Type;
        security.Currency = request.Currency;
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
        var unrealized = marketValue - position.CostBasis;

        return new HoldingResponse(
            accountId.Value,
            FromEntity(security),
            position.Quantity,
            position.Quantity == 0m ? 0m : decimal.Round(position.CostBasis / position.Quantity, 4),
            position.CostBasis,
            marketValue,
            unrealized,
            unrealized is { } change && position.CostBasis != 0m
                ? decimal.Round(change / position.CostBasis * 100m, 2)
                : null,
            marketValueReporting is { } reporting ? Money.Round(reporting) : null,
            realizedGain,
            dividends);
    }
}
