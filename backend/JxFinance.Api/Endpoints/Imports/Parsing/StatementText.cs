using System.Text;

namespace JxFinance.Endpoints.Imports.Parsing;

public static class StatementText
{
    private static readonly UTF8Encoding StrictUtf8 = new(false, true);

    public static string Read(Stream stream)
    {
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        var bytes = buffer.ToArray();
        try
        {
            return StrictUtf8.GetString(bytes).TrimStart('﻿');
        }
        catch (DecoderFallbackException)
        {
            return CodePagesEncodingProvider.Instance.GetEncoding(1257)!.GetString(bytes);
        }
    }
}
