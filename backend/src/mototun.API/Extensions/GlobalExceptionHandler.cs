using System.Data.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace mototun.API.Extensions;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, message) = exception switch
        {
            BadHttpRequestException badHttpRequestException when IsRequestBodyTooLarge(badHttpRequestException)
                => (StatusCodes.Status413PayloadTooLarge, "Le fichier est trop volumineux. Taille maximale: 50 Mo."),
            BadHttpRequestException => (StatusCodes.Status400BadRequest, "La demande est incomplete ou invalide."),
            DbUpdateException => (StatusCodes.Status503ServiceUnavailable, "La base de donnees ne repond pas pour le moment."),
            DbException => (StatusCodes.Status503ServiceUnavailable, "La base de donnees ne repond pas pour le moment."),
            _ => (StatusCodes.Status500InternalServerError, "Une erreur est survenue. Reessayez dans un instant.")
        };

        _logger.LogError(
            exception,
            "Unhandled exception for {Method} {Path}",
            httpContext.Request.Method,
            httpContext.Request.Path);

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsJsonAsync(new
        {
            success = false,
            message
        }, cancellationToken);

        return true;
    }

    private static bool IsRequestBodyTooLarge(BadHttpRequestException exception)
    {
        if (exception.StatusCode == StatusCodes.Status413PayloadTooLarge)
        {
            return true;
        }

        return exception.Message.Contains("Request body too large", StringComparison.OrdinalIgnoreCase)
            || exception.Message.Contains("request body too large", StringComparison.OrdinalIgnoreCase)
            || exception.Message.Contains("Multipart body length limit", StringComparison.OrdinalIgnoreCase)
            || exception.Message.Contains("request body", StringComparison.OrdinalIgnoreCase)
                && exception.Message.Contains("too large", StringComparison.OrdinalIgnoreCase);
    }
}
