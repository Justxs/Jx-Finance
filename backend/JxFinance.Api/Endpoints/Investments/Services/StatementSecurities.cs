using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Domain.Investments;
using JxFinance.Infrastructure.Brokers.InteractiveBrokers;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Investments.Services;

internal sealed class StatementSecurities(AppDbContext db)
{
    private readonly Dictionary<long, Security> renamedContracts = [];
    private readonly Dictionary<(string Isin, Currency Currency), Security> renamedIsins = [];
    private List<Security> securities = [];

    public int Created { get; private set; }

    public async Task LoadAsync(CancellationToken cancellationToken) =>
        securities = await db.Securities.ToListAsync(cancellationToken);

    public Security? Find(FlexInstrument instrument)
    {
        var symbol = SymbolOf(instrument);
        var isin = instrument.Isin?.ToUpperInvariant();
        if (instrument.ContractId is { } contractId && renamedContracts.TryGetValue(contractId, out var renamed))
        {
            return renamed;
        }

        if (isin is not null && renamedIsins.TryGetValue((isin, instrument.Currency), out renamed))
        {
            return renamed;
        }

        return securities.FirstOrDefault(s => instrument.ContractId is not null && s.BrokerContractId == instrument.ContractId)
            ?? securities.FirstOrDefault(s => isin is not null && s.Isin == isin && s.Currency == instrument.Currency)
            ?? securities.FirstOrDefault(s => s.Symbol == symbol && s.Currency == instrument.Currency);
    }

    public Security? FindParent(string isin, Currency currency) =>
        renamedIsins.GetValueOrDefault((isin, currency))
            ?? securities.FirstOrDefault(s => s.Isin == isin && s.Currency == currency);

    public Security Get(SecurityId id) => securities.First(s => s.Id == id);

    public Security Resolve(FlexInstrument instrument)
    {
        var security = Find(instrument);
        if (security is null)
        {
            security = new Security
            {
                Symbol = SymbolOf(instrument),
                Name = TextLimit.Ellipsize(instrument.Name, Security.NameMaxLength),
                Isin = instrument.Isin?.ToUpperInvariant(),
                Exchange = TextLimit.Ellipsize(instrument.Exchange, Security.ExchangeMaxLength),
                Currency = instrument.Currency,
                Type = instrument switch
                {
                    { SubCategory: "ETF" } => SecurityType.Etf,
                    { AssetCategory: "FUND" } => SecurityType.Fund,
                    _ => SecurityType.Stock,
                },
            };
            securities.Add(security);
            db.Securities.Add(security);
            Created++;
        }

        security.BrokerContractId ??= instrument.ContractId;
        security.Isin ??= instrument.Isin?.ToUpperInvariant();
        return security;
    }

    public void TakeOver(Security security, FlexInstrument successor, List<FlexCorporateAction> rows)
    {
        security.BrokerContractId = successor.ContractId ?? security.BrokerContractId;
        security.Isin = successor.Isin?.ToUpperInvariant() ?? security.Isin;
        foreach (var row in rows)
        {
            if (row.Instrument.ContractId is { } contractId)
            {
                renamedContracts[contractId] = security;
            }

            if (row.Instrument.Isin is { } isin)
            {
                renamedIsins[(isin.ToUpperInvariant(), row.Instrument.Currency)] = security;
            }
        }
    }

    private static string SymbolOf(FlexInstrument instrument) =>
        TextLimit.Cut(instrument.Symbol.ToUpperInvariant(), Security.SymbolMaxLength);
}
