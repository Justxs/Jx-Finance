using System.Net.Mime;
using FastEndpoints;

namespace JxFinance.Common;

public static class CreatedDescription
{
    public static RouteHandlerBuilder ProducesCreated<TResponse>(this RouteHandlerBuilder builder) =>
        builder.ClearDefaultProduces(StatusCodes.Status200OK).Produces<TResponse>(StatusCodes.Status201Created, MediaTypeNames.Application.Json);

    public static RouteHandlerBuilder ProducesFile(
        this RouteHandlerBuilder builder,
        string contentType,
        params string[] additionalContentTypes) =>
        builder.ClearDefaultProduces(StatusCodes.Status200OK)
            .Produces<byte[]>(StatusCodes.Status200OK, contentType, additionalContentTypes);
}
