using System.Text.Json;

namespace JxFinance.Common.Json;

public sealed class DecimalStringException() : JsonException(DecimalString.Invalid);
