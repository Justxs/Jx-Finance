using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace JxFinance.Common.Json;

public sealed class QuantityJsonConverter : JsonConverter<decimal>
{
    public override decimal Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        DecimalString.Read(ref reader);

    public override void Write(Utf8JsonWriter writer, decimal value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString("0.########", CultureInfo.InvariantCulture));
}
