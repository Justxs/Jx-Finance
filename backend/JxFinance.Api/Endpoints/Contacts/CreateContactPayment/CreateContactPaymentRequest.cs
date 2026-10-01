using System.Text.Json.Serialization;
using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Contacts;

namespace JxFinance.Endpoints.Contacts.CreateContactPayment;

public sealed record CreateContactPaymentRequest(
    Guid Id,
    [property: JsonRequired] ContactPaymentDirection Direction,
    [property: Money] decimal Amount,
    Currency Currency,
    DateOnly Date,
    string? Note = null);
