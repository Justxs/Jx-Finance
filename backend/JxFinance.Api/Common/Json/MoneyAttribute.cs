using System.Text.Json.Serialization;

namespace JxFinance.Common.Json;

[AttributeUsage(AttributeTargets.Property)]
public sealed class MoneyAttribute() : JsonConverterAttribute(typeof(MoneyJsonConverter));
