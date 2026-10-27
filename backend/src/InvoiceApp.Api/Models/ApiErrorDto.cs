namespace InvoiceApp.Api.Models;

/// <summary>
/// Standard generic data transfer object for all API error responses.
/// </summary>
public record ApiErrorDto(
    string Error,
    string? Code = null,
    int? Status = null,
    IReadOnlyList<string>? Details = null
);
