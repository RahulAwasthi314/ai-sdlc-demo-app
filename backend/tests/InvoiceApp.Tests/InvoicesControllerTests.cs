using InvoiceApp.Api.Controllers;
using InvoiceApp.Api.Models;
using InvoiceApp.Domain;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace InvoiceApp.Tests;

/// <summary>Unit tests verifying InvoicesController actions, validation, and status transitions.</summary>
public class InvoicesControllerTests
{
    private static (InvoicesController Controller, FakeInvoiceRepository Repository) CreateController(params Invoice[] initial)
    {
        var repository = new FakeInvoiceRepository(initial);
        var approvalService = new ApprovalService(repository);
        var controller = new InvoicesController(repository, approvalService);
        return (controller, repository);
    }

    [Fact]
    public void Create_ValidRequest_ReturnsCreatedAtActionWithInvoice()
    {
        var (controller, _) = CreateController();
        var request = new InvoicesController.CreateInvoiceRequest("Acme Corp", 1500m);

        var result = controller.Create(request);

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var invoice = Assert.IsType<Invoice>(createdResult.Value);
        Assert.Equal("Acme Corp", invoice.CustomerName);
        Assert.Equal(1500m, invoice.Amount);
        Assert.Equal(InvoiceStatus.Draft, invoice.Status);
    }

    [Fact]
    public void Create_EmptyCustomerName_ReturnsBadRequestWithApiErrorDto()
    {
        var (controller, _) = CreateController();
        var request = new InvoicesController.CreateInvoiceRequest("  ", 1500m);

        var result = controller.Create(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var errorDto = Assert.IsType<ApiErrorDto>(badRequest.Value);
        Assert.Equal("Customer name is required.", errorDto.Error);
        Assert.Equal("VALIDATION_ERROR", errorDto.Code);
    }

    [Fact]
    public void Create_ZeroOrNegativeAmount_ReturnsBadRequestWithApiErrorDto()
    {
        var (controller, _) = CreateController();
        var request = new InvoicesController.CreateInvoiceRequest("Acme Corp", 0m);

        var result = controller.Create(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        var errorDto = Assert.IsType<ApiErrorDto>(badRequest.Value);
        Assert.Equal("Amount must be greater than zero.", errorDto.Error);
        Assert.Equal("VALIDATION_ERROR", errorDto.Code);
    }

    [Fact]
    public void Submit_DraftInvoice_ReturnsOkWithPendingApproval()
    {
        var existing = new Invoice { Id = "INV-100", CustomerName = "Test Co", Amount = 500m, Status = InvoiceStatus.Draft };
        var (controller, _) = CreateController(existing);

        var result = controller.Submit("INV-100");

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var invoice = Assert.IsType<Invoice>(okResult.Value);
        Assert.Equal(InvoiceStatus.PendingApproval, invoice.Status);
    }

    [Fact]
    public void Submit_NotFoundInvoice_ReturnsNotFoundWithApiErrorDto()
    {
        var (controller, _) = CreateController();

        var result = controller.Submit("INV-404");

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result.Result);
        var errorDto = Assert.IsType<ApiErrorDto>(notFoundResult.Value);
        Assert.Equal("NOT_FOUND", errorDto.Code);
    }

    [Fact]
    public void GetAll_ReturnsAllInvoices()
    {
        var inv1 = new Invoice { Id = "INV-1", CustomerName = "C1", Amount = 100m, Status = InvoiceStatus.Draft };
        var inv2 = new Invoice { Id = "INV-2", CustomerName = "C2", Amount = 200m, Status = InvoiceStatus.PendingApproval };
        var (controller, _) = CreateController(inv1, inv2);

        var result = controller.GetAll(null);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IReadOnlyList<Invoice>>(okResult.Value);
        Assert.Equal(2, list.Count);
    }

    [Fact]
    public void GetAll_WithStatusFilter_ReturnsFilteredInvoices()
    {
        var inv1 = new Invoice { Id = "INV-1", CustomerName = "C1", Amount = 100m, Status = InvoiceStatus.Draft };
        var inv2 = new Invoice { Id = "INV-2", CustomerName = "C2", Amount = 200m, Status = InvoiceStatus.PendingApproval };
        var (controller, _) = CreateController(inv1, inv2);

        var result = controller.GetAll("PendingApproval");

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IReadOnlyList<Invoice>>(okResult.Value);
        Assert.Single(list);
        Assert.Equal("INV-2", list[0].Id);
    }

    [Fact]
    public void GetById_WhenExists_ReturnsOk()
    {
        var inv1 = new Invoice { Id = "INV-1", CustomerName = "C1", Amount = 100m, Status = InvoiceStatus.Draft };
        var (controller, _) = CreateController(inv1);

        var result = controller.GetById("INV-1");

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var invoice = Assert.IsType<Invoice>(okResult.Value);
        Assert.Equal("INV-1", invoice.Id);
    }

    [Fact]
    public void GetById_WhenMissing_ReturnsNotFound()
    {
        var (controller, _) = CreateController();

        var result = controller.GetById("INV-999");

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result.Result);
        var errorDto = Assert.IsType<ApiErrorDto>(notFoundResult.Value);
        Assert.Equal("NOT_FOUND", errorDto.Code);
    }
}

