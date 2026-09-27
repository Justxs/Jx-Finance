using System.Xml;
using System.Xml.Linq;

namespace JxFinance.Common.Formats;

public static class SafeXml
{
    public static async Task<XDocument?> LoadAsync(Stream stream, CancellationToken cancellationToken)
    {
        var settings = new XmlReaderSettings
        {
            Async = true,
            DtdProcessing = DtdProcessing.Prohibit,
            XmlResolver = null,
            MaxCharactersInDocument = 100_000_000,
        };
        try
        {
            using var reader = XmlReader.Create(stream, settings);
            return await XDocument.LoadAsync(reader, LoadOptions.None, cancellationToken);
        }
        catch (XmlException)
        {
            return null;
        }
    }
}
