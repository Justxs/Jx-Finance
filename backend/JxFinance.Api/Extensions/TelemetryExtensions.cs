using System.Diagnostics;
using JxFinance.Common;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Discord;
using JxFinance.Infrastructure.MarketPrices;
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
                .AddHttpClientInstrumentation(options =>
                    options.EnrichWithHttpRequestMessage = (activity, request) => Redact(activity, request))
                .AddNpgsql())
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation()
                .AddNpgsqlInstrumentation())
            .UseOtlpExporter();

        return builder;
    }

    public static string? RedactedDiscordUrl(Uri? uri) =>
        uri is not null && uri.Host.EndsWith(DiscordWebhookClient.HostName, StringComparison.OrdinalIgnoreCase)
            ? $"{uri.Scheme}://{uri.Host}/api/webhooks/{SecretText.Hidden}"
            : null;

    public static string? RedactedEodhdUrl(Uri? uri)
    {
        if (uri is null || !uri.Host.EndsWith(EodhdPriceProvider.HostName, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var query = uri.Query.TrimStart('?')
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.StartsWith(EodhdPriceProvider.TokenParameter + "=", StringComparison.OrdinalIgnoreCase)
                ? $"{EodhdPriceProvider.TokenParameter}={SecretText.Hidden}"
                : part);
        return $"{uri.GetLeftPart(UriPartial.Path)}?{string.Join('&', query)}";
    }

    private static void Redact(Activity activity, HttpRequestMessage request)
    {
        if ((RedactedDiscordUrl(request.RequestUri) ?? RedactedEodhdUrl(request.RequestUri)) is not { } redacted)
        {
            return;
        }

        activity.SetTag("url.full", redacted);
        activity.SetTag("url.path", null);
        activity.SetTag("url.query", null);
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
