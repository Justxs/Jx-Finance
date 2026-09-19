using System.Text.Json;
using System.Text.Json.Serialization;
using FastEndpoints;
using JxFinance.Api;
using JxFinance.Common.Errors;
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
        app.UseMiddleware<FeatureGateMiddleware>();

        app.UseFastEndpoints(c =>
        {
            c.Endpoints.ShortNames = true;
            c.Binding.ReflectionCache.AddFromJxFinanceApi();
            c.Endpoints.Configurator = ep => ep.Description(d => d.ProducesProblemDetails(500));
            c.Serializer.Options.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
            c.Serializer.SerializerErrorsField = ProblemResponses.SerializerErrorsField;
            c.Binding.JsonExceptionTransformer = ProblemResponses.FromJsonException;
            c.Errors.UseProblemDetails(p =>
            {
                p.IndicateErrorCode = true;
                p.AllowDuplicateErrors = false;
                p.TypeValue = "https://tools.ietf.org/html/rfc9110#section-15.5";
            });
            c.Errors.ResponseBuilder = ProblemResponses.Build;
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
