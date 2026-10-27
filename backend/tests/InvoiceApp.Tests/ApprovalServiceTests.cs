using InvoiceApp.Domain;
using Xunit;

namespace InvoiceApp.Tests;

/// <summary>Unit tests verifying invoice lifecycle transitions, role limits, and decision rules.</summary>
public class ApprovalServiceTests
{
    private static Invoice InvoiceWith(string id, InvoiceStatus status, decimal amount = 100m) =>
        new() { Id = id, CustomerName = "Test Customer", Amount = amount, Status = status };

    private static ApprovalService ServiceFor(params Invoice[] invoices) =>
        new(new FakeInvoiceRepository(invoices));

    [Fact]
    public void Submit_MovesDraftToPendingApproval()
    {
        var invoice = InvoiceWith("INV-1", InvoiceStatus.Draft);
        var result = ServiceFor(invoice).Submit("INV-1");

        Assert.Equal(InvoiceStatus.PendingApproval, result.Status);
    }

    [Fact]
    public void Submit_RejectsInvoiceThatIsNotADraft()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.Approved));

        Assert.Throws<InvalidOperationException>(() => service.Submit("INV-1"));
    }

    [Fact]
    public void Approve_SetsStatusApproverAndTimestamp()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.PendingApproval));
        var result = service.Approve("INV-1", "demo.approver");

        Assert.Equal(InvoiceStatus.Approved, result.Status);
        Assert.Equal("demo.approver", result.DecidedBy);
        Assert.NotNull(result.DecidedAt);
    }

    [Fact]
    public void Approve_RejectsInvoiceThatIsStillADraft()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.Draft));

        Assert.Throws<InvalidOperationException>(() => service.Approve("INV-1", "demo.approver"));
    }

    [Fact]
    public void Approve_ThrowsWhenInvoiceDoesNotExist()
    {
        var service = ServiceFor();

        Assert.Throws<KeyNotFoundException>(() => service.Approve("INV-404", "demo.approver"));
    }

    [Fact]
    public void Reject_RecordsReasonAndApprover()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.PendingApproval));
        var result = service.Reject("INV-1", "demo.approver", "Duplicate invoice");

        Assert.Equal(InvoiceStatus.Rejected, result.Status);
        Assert.Equal("Duplicate invoice", result.DecisionNote);
    }

    [Fact]
    public void Reject_RequiresAReason()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.PendingApproval));

        Assert.Throws<ArgumentException>(() => service.Reject("INV-1", "demo.approver", "  "));
    }

    [Fact]
    public void Approve_ManagerWithinLimit_ApprovesSuccessfully()
    {
        var service = ServiceFor(InvoiceWith("INV-M1", InvoiceStatus.PendingApproval, 45000m));
        var result = service.Approve("INV-M1", "demo.manager", "Manager");

        Assert.Equal(InvoiceStatus.Approved, result.Status);
        Assert.Equal("demo.manager", result.DecidedBy);
    }

    [Fact]
    public void Approve_ManagerAtExactBoundary_ApprovesSuccessfully()
    {
        var service = ServiceFor(InvoiceWith("INV-M2", InvoiceStatus.PendingApproval, 50000m));
        var result = service.Approve("INV-M2", "demo.manager", "Manager");

        Assert.Equal(InvoiceStatus.Approved, result.Status);
        Assert.Equal("demo.manager", result.DecidedBy);
    }

    [Fact]
    public void Approve_ManagerExceedingBoundary_ThrowsApprovalLimitExceededException()
    {
        var service = ServiceFor(InvoiceWith("INV-M3", InvoiceStatus.PendingApproval, 50000.01m));

        var ex = Assert.Throws<ApprovalLimitExceededException>(() =>
            service.Approve("INV-M3", "demo.manager", "Manager"));

        Assert.Contains("Manager approval limit exceeded", ex.Message);
        Assert.Contains("50000.00", ex.Message);
    }

    [Fact]
    public void Approve_ManagerSignificantlyOverLimit_ThrowsApprovalLimitExceededException()
    {
        var service = ServiceFor(InvoiceWith("INV-M4", InvoiceStatus.PendingApproval, 75000m));

        var ex = Assert.Throws<ApprovalLimitExceededException>(() =>
            service.Approve("INV-M4", "demo.manager", "Manager"));

        Assert.Contains("Manager approval limit exceeded", ex.Message);
    }

    [Fact]
    public void Approve_AdminRole_ThrowsInvalidOperationExceptionDueToSegregationOfDuties()
    {
        var service = ServiceFor(InvoiceWith("INV-A1", InvoiceStatus.PendingApproval, 1000m));

        var ex = Assert.Throws<InvalidOperationException>(() =>
            service.Approve("INV-A1", "demo.admin", "Admin"));

        Assert.Contains("Administrators are not authorized to decide invoices", ex.Message);
    }

    [Fact]
    public void Reject_ManagerWithinLimit_RejectsSuccessfully()
    {
        var service = ServiceFor(InvoiceWith("INV-R1", InvoiceStatus.PendingApproval, 50000m));
        var result = service.Reject("INV-R1", "demo.manager", "Incorrect amount", "Manager");

        Assert.Equal(InvoiceStatus.Rejected, result.Status);
        Assert.Equal("demo.manager", result.DecidedBy);
        Assert.Equal("Incorrect amount", result.DecisionNote);
    }

    [Fact]
    public void Reject_ManagerOverLimit_ThrowsApprovalLimitExceededException()
    {
        var service = ServiceFor(InvoiceWith("INV-R2", InvoiceStatus.PendingApproval, 50000.01m));

        var ex = Assert.Throws<ApprovalLimitExceededException>(() =>
            service.Reject("INV-R2", "demo.manager", "Over budget", "Manager"));

        Assert.Contains("Manager rejection limit exceeded", ex.Message);
    }

    [Fact]
    public void Reject_AdminRole_ThrowsInvalidOperationExceptionDueToSegregationOfDuties()
    {
        var service = ServiceFor(InvoiceWith("INV-RA1", InvoiceStatus.PendingApproval, 500m));

        var ex = Assert.Throws<InvalidOperationException>(() =>
            service.Reject("INV-RA1", "demo.admin", "Admin reject", "Admin"));

        Assert.Contains("Administrators are not authorized to decide invoices", ex.Message);
    }

    [Fact]
    public void Approve_ApproverRole_CanApproveHighValueInvoice()
    {
        var service = ServiceFor(InvoiceWith("INV-H1", InvoiceStatus.PendingApproval, 150000m));
        var result = service.Approve("INV-H1", "demo.approver", "Approver");

        Assert.Equal(InvoiceStatus.Approved, result.Status);
        Assert.Equal("demo.approver", result.DecidedBy);
    }
}
