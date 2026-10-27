using System.Net;
using System.Text.Json;
using InvoiceApp.Api.Controllers;
using InvoiceApp.Api.Middleware;
using InvoiceApp.Api.Models;
using InvoiceApp.Domain;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace InvoiceApp.Tests;

public class ApiErrorHandlingTests
{
    private class TestController : ApiControllerBase
    {
        public ActionResult<Invoice> TestHandle(Func<Invoice> action) => Handle(action);
    }

    [Fact]
    public void Handle_WhenKeyNotFoundExceptionThrown_Returns404WithApiErrorDto()
    {
        var controller = new TestController();

        var result = controller.TestHandle(() => throw new KeyNotFoundException("Entity not found."));

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result.Result);
        Assert.Equal((int)HttpStatusCode.NotFound, notFoundResult.StatusCode);

        var errorDto = Assert.IsType<ApiErrorDto>(notFoundResult.Value);
        Assert.Equal("Entity not found.", errorDto.Error);
        Assert.Equal("NOT_FOUND", errorDto.Code);
        Assert.Equal(404, errorDto.Status);
    }

    [Fact]
    public void Handle_WhenArgumentExceptionThrown_Returns400WithApiErrorDto()
    {
        var controller = new TestController();

        var result = controller.TestHandle(() => throw new ArgumentException("Invalid field value."));

        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal((int)HttpStatusCode.BadRequest, badRequestResult.StatusCode);

        var errorDto = Assert.IsType<ApiErrorDto>(badRequestResult.Value);
        Assert.Equal("Invalid field value.", errorDto.Error);
        Assert.Equal("BAD_REQUEST", errorDto.Code);
        Assert.Equal(400, errorDto.Status);
    }

    [Fact]
    public void Handle_WhenInvalidOperationExceptionThrown_Returns409WithApiErrorDto()
    {
        var controller = new TestController();

        var result = controller.TestHandle(() => throw new InvalidOperationException("Invoice is not in draft state."));

        var conflictResult = Assert.IsType<ConflictObjectResult>(result.Result);
        Assert.Equal((int)HttpStatusCode.Conflict, conflictResult.StatusCode);

        var errorDto = Assert.IsType<ApiErrorDto>(conflictResult.Value);
        Assert.Equal("Invoice is not in draft state.", errorDto.Error);
        Assert.Equal("CONFLICT", errorDto.Code);
        Assert.Equal(409, errorDto.Status);
    }

    [Fact]
    public async Task Middleware_WhenUnhandledExceptionOccurs_Returns500WithApiErrorDtoWithoutLeakingStack()
    {
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new Exception("Sensitive internal database connection timeout!"),
            NullLogger<GlobalExceptionMiddleware>.Instance
        );

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal((int)HttpStatusCode.InternalServerError, context.Response.StatusCode);
        Assert.Equal("application/json", context.Response.ContentType);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var body = await reader.ReadToEndAsync();

        var errorDto = JsonSerializer.Deserialize<ApiErrorDto>(body, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.NotNull(errorDto);
        Assert.Equal("An unexpected internal server error occurred.", errorDto.Error);
        Assert.Equal("INTERNAL_ERROR", errorDto.Code);
        Assert.Equal(500, errorDto.Status);
    }

    [Fact]
    public async Task Middleware_WhenKeyNotFoundExceptionOccurs_Returns404WithApiErrorDto()
    {
        var middleware = new GlobalExceptionMiddleware(
            _ => throw new KeyNotFoundException("Invoice 'INV-999' does not exist."),
            NullLogger<GlobalExceptionMiddleware>.Instance
        );

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        Assert.Equal((int)HttpStatusCode.NotFound, context.Response.StatusCode);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var body = await reader.ReadToEndAsync();

        var errorDto = JsonSerializer.Deserialize<ApiErrorDto>(body, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        Assert.NotNull(errorDto);
        Assert.Equal("Invoice 'INV-999' does not exist.", errorDto.Error);
        Assert.Equal("NOT_FOUND", errorDto.Code);
        Assert.Equal(404, errorDto.Status);
    }
}
