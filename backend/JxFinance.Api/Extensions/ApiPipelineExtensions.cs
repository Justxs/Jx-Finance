using System.Text.Json;
using System.Text.Json.Serialization;
using FastEndpoints;
using JxFinance.Api;
using JxFinance.Common.Errors;
using JxFinance.Common.Middleware;
using JxFinance.Infrastructure.Configuration;
using Scalar.AspNetCore;
using Serilog;
using Serilog.Events;

namespace JxFinance.Extensions;

public static class ApiPipelineExtensions
{
    public const string HealthPath = "/health";

    private const string DocsPath = "/scalar/" + OpenApiExtensions.DocumentName;

    public static WebApplication UseApiPipeline(this WebApplication app)
    {
        app.UseExceptionHandler(new ExceptionHandlerOptions { ExceptionHandler = ProblemResponses.WriteServerErrorAsync });
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseSerilogRequestLogging(options => options.GetLevel = RequestLogLevel);

        app.UseAuthentication();
        app.UseAuthorization();
        app.UseMiddleware<FeatureGateMiddleware>();
        app.UseMiddleware<ActiveHouseholdMiddleware>();

        app.UseFastEndpoints(ConfigureFastEndpoints);
        if (ServesApiDocs(app.Configuration, app.Environment))
        {
            app.MapApiDocs();
        }

        app.MapHealthChecks(HealthPath);

        return app;
    }

    public static void ConfigureFastEndpoints(Config c)
    {
        c.Endpoints.ShortNames = true;
        c.Binding.ReflectionCache.AddFromJxFinanceApi();
        c.Endpoints.Configurator = ep => ep.Description(d => d.ProducesProblemDetails(500));
        c.Serializer.Options.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        c.Serializer.SerializerErrorsField = ProblemResponses.SerializerErrorsField;
        c.Errors.GeneralErrorsField = ProblemResponses.GeneralErrorsField;
        c.Binding.JsonExceptionTransformer = ProblemResponses.FromJsonException;
        c.Errors.UseProblemDetails(p =>
        {
            p.IndicateErrorCode = true;
            p.AllowDuplicateErrors = false;
            p.TypeValue = "https://tools.ietf.org/html/rfc9110#section-15.5";
            p.TitleTransformer = ProblemResponses.TitleFor;
        });
        c.Errors.ResponseBuilder = ProblemResponses.Build;
    }

    public static bool ServesApiDocs(IConfiguration configuration, IHostEnvironment environment) =>
        configuration.GetValue(ConfigKeys.ApiDocs, environment.IsDevelopment());

    private static void MapApiDocs(this WebApplication app)
    {
        app.MapOpenApi();

        app.MapScalarApiReference(options =>
        {
            options.WithTitle(OpenApiExtensions.Title)
                .WithOpenApiRoutePattern("/openapi/{documentName}.json");
        });

        app.MapGet("/", () => Results.Redirect(DocsPath)).ExcludeFromDescription();
    }

    private static LogEventLevel RequestLogLevel(HttpContext context, double elapsedMs, Exception? exception)
    {
        if (context.RequestAborted.IsCancellationRequested) return LogEventLevel.Debug;
        return exception is not null || context.Response.StatusCode >= 500 ? LogEventLevel.Error : LogEventLevel.Information;
    }
}
