using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.Transactions.GetPlaces;

public sealed class GetPlacesValidator : Validator<GetPlacesRequest>
{
    public GetPlacesValidator()
    {
        RuleFor(r => r.Search).HasMaxLength(TransactionPlace.MaxLength);
        RuleFor(r => r.Lat)
            .Must((r, lat) => TransactionPlace.IsValidPair(lat, r.Lon))
            .WithErrorCode(ErrorCodes.TransactionLocationInvalid)
            .WithMessage("Send lat from -90 to 90 and lon from -180 to 180 together, or neither.");
    }
}
