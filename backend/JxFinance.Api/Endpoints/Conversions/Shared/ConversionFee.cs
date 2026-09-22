using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.Conversions.Shared;

public sealed record ConversionFee(TransactionId Id, Money Amount, CategoryId? CategoryId);
