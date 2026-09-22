using JxFinance.Infrastructure.Configuration;
using Npgsql;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Serilog;
using Serilog.Sinks.OpenTelemetry;

namespace JxFinance.Extensions;

public static class TelemetryExtensions
{
    public const string ServiceName = "jxfinance-api";
    private const string OtlpEndpointKey = "OTEL_EXPORTER_OTLP_ENDPOINT";

    public static bool IsTelemetryEnabled(this IConfiguration configuration) =>
        !string.IsNullOrWhiteSpace(configuration[OtlpEndpointKey]);

    public static WebApplicationBuilder AddTelemetry(this WebApplicationBuilder builder)
    {
        if (!builder.Configuration.IsTelemetryEnabled())
        {
            return builder;
        }

        builder.Services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(
                serviceName: builder.Configuration[ConfigKeys.OtelServiceName] ?? ServiceName,
                serviceVersion: typeof(TelemetryExtensions).Assembly.GetName().Version?.ToString()))
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation(options =>
                    options.Filter = context => !context.Request.Path.StartsWithSegments(ApiPipelineExtensions.HealthPath))
                .AddHttpClientInstrumentation()
                .AddNpgsql())
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation()
                .AddNpgsqlInstrumentation())
            .UseOtlpExporter();

        return builder;
    }

    public static LoggerConfiguration WriteToTelemetry(this LoggerConfiguration logger, IConfiguration configuration)
    {
        if (!configuration.IsTelemetryEnabled())
        {
            return logger;
        }

        return logger.WriteTo.OpenTelemetry(options =>
        {
            options.ResourceAttributes = new Dictionary<string, object>
            {
                ["service.name"] = configuration[ConfigKeys.OtelServiceName] ?? ServiceName
            };
            options.IncludedData |= IncludedData.TraceIdField | IncludedData.SpanIdField;
        });
    }
}
