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
            BadHttpRequestException => (StatusCodes.Status400BadRequest, "Invalid request."),
            DbUpdateException => (StatusCodes.Status503ServiceUnavailable, "Database connection is unavailable. Verify database configuration."),
            DbException => (StatusCodes.Status503ServiceUnavailable, "Database connection is unavailable. Verify database configuration."),
            _ => (StatusCodes.Status500InternalServerError, "Unexpected server error.")
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
}
