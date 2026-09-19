using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using JxFinance.Domain.Common;

namespace JxFinance.Common.Json;

public sealed class MoneyJsonConverter : JsonConverter<decimal>
{
    public override decimal Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        DecimalString.Read(ref reader);

    public override void Write(Utf8JsonWriter writer, decimal value, JsonSerializerOptions options) =>
        writer.WriteStringValue(Money.Round(value).ToString("0.00", CultureInfo.InvariantCulture));
}
