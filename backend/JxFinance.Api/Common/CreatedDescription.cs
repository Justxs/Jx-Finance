using System.Net.Mime;
using FastEndpoints;

namespace JxFinance.Common;

public static class CreatedDescription
{
    public static RouteHandlerBuilder ProducesCreated<TResponse>(this RouteHandlerBuilder builder) =>
        builder.ClearDefaultProduces(StatusCodes.Status200OK).Produces<TResponse>(StatusCodes.Status201Created, MediaTypeNames.Application.Json);
}
