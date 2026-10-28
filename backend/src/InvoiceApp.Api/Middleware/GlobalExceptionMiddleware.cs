using System.Net;
using System.Text.Json;
using InvoiceApp.Api.Models;
using InvoiceApp.Domain;

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
            ApprovalLimitExceededException ale => (HttpStatusCode.BadRequest, "LIMIT_EXCEEDED", ale.Message),
            ArgumentException ae => (HttpStatusCode.BadRequest, "BAD_REQUEST", ae.Message),
            InvalidOperationException ioe when ioe.Message.Contains("The same user may never count as both approvers on one invoice", StringComparison.OrdinalIgnoreCase)
                => (HttpStatusCode.BadRequest, "SAME_APPROVER_NOT_ALLOWED", ioe.Message),
            InvalidOperationException ioe when ioe.Message.Contains("Administrators are not authorized to decide invoices", StringComparison.OrdinalIgnoreCase)
                => (HttpStatusCode.BadRequest, "ROLE_NOT_PERMITTED", ioe.Message),
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
