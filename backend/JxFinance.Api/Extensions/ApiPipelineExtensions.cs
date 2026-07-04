using System.Text.Json;
using System.Text.Json.Serialization;
using FastEndpoints;
using FastEndpoints.Swagger;
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

        app.UseFastEndpoints(c =>
        {
            c.Endpoints.ShortNames = true;
            c.Serializer.Options.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        });
        app.UseSwaggerGen();

        app.MapScalarApiReference(options =>
        {
            options.WithTitle("Jx Finance API")
                .WithOpenApiRoutePattern("/swagger/{documentName}/swagger.json");
        });

        app.MapHealthChecks("/health");

        app.MapGet("/", () => Results.Redirect("/scalar/v1")).ExcludeFromDescription();

        return app;
    }
}
