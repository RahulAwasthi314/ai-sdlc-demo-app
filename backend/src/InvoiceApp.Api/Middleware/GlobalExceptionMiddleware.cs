using System.Net;
using System.Text.Json;
using InvoiceApp.Api.Models;

namespace InvoiceApp.Api.Middleware;

/// <summary>
/// Global exception-handling middleware ensuring all uncaught errors return a standard ApiErrorDto.
/// </summary>
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, code, message) = exception switch
        {
            KeyNotFoundException knf => (HttpStatusCode.NotFound, "NOT_FOUND", knf.Message),
            ArgumentException ae => (HttpStatusCode.BadRequest, "BAD_REQUEST", ae.Message),
            InvalidOperationException ioe => (HttpStatusCode.Conflict, "CONFLICT", ioe.Message),
            UnauthorizedAccessException uae => (HttpStatusCode.Unauthorized, "UNAUTHORIZED", uae.Message),
            _ => (HttpStatusCode.InternalServerError, "INTERNAL_ERROR", "An unexpected internal server error occurred.")
        };

        var errorDto = new ApiErrorDto(message, code, (int)statusCode);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        return context.Response.WriteAsync(JsonSerializer.Serialize(errorDto, options));
    }
}
