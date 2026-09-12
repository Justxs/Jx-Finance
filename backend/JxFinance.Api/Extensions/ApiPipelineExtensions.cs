using System.Text.Json;
using System.Text.Json.Serialization;
using FastEndpoints;
using JxFinance.Common.Middleware;
using Scalar.AspNetCore;
using Serilog;

namespace JxFinance.Extensions;

public static class ApiPipelineExtensions
{
    public static WebApplication UseApiPipeline(this WebApplication app)
    {
        app.UseExceptionHandler();
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseSerilogRequestLogging();

        app.UseAuthentication();
        app.UseAuthorization();

        app.UseFastEndpoints(c =>
        {
            c.Endpoints.ShortNames = true;
            c.Endpoints.Configurator = ep => ep.Description(d => d.ProducesProblemDetails(500));
            c.Serializer.Options.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
            c.Errors.UseProblemDetails(p =>
            {
                p.IndicateErrorCode = true;
                p.AllowDuplicateErrors = false;
                p.TypeValue = "https://tools.ietf.org/html/rfc9110#section-15.5";
            });
        });
        app.MapOpenApi();

        app.MapScalarApiReference(options =>
        {
            options.WithTitle("Jx Finance API")
                .WithOpenApiRoutePattern("/openapi/{documentName}.json");
        });

        app.MapHealthChecks("/health");

        app.MapGet("/", () => Results.Redirect("/scalar/v1")).ExcludeFromDescription();

        return app;
    }
}
