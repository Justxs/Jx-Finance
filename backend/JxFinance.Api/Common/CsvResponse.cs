using System.Net.Mime;
using System.Text;
using FastEndpoints;

namespace JxFinance.Common;

public static class CsvResponse
{
    private const int BufferSize = 16 * 1024;

    public static StreamWriter StartCsv(this HttpContext context, string fileName)
    {
        context.MarkResponseStart();
        context.Response.StatusCode = StatusCodes.Status200OK;
        context.Response.ContentType = MediaTypeNames.Text.Csv;
        context.Response.Headers.ContentDisposition = $"attachment; filename={fileName}";
        return new StreamWriter(context.Response.Body, new UTF8Encoding(false), BufferSize, leaveOpen: true);
    }
}
