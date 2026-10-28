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
    public void Invoice_DefaultValues_AreInitializedCorrectly()
    {
        var invoice = new Invoice();
        Assert.Equal(string.Empty, invoice.Id);
        Assert.Equal(string.Empty, invoice.CustomerName);
        Assert.NotNull(invoice.Approvers);
        Assert.Empty(invoice.Approvers);
    }

    [Fact]
    public void Submit_MovesDraftToPendingApproval()
    {
        var repository = new FakeInvoiceRepository(InvoiceWith("INV-1", InvoiceStatus.Draft));
        var service = new ApprovalService(repository);
        var result = service.Submit("INV-1");

        Assert.Equal(InvoiceStatus.PendingApproval, result.Status);
        Assert.Equal(InvoiceStatus.PendingApproval, repository.GetById("INV-1")!.Status);
        Assert.Contains(result, repository.UpdatedInvoices);
    }

    [Fact]
    public void Submit_RejectsInvoiceThatIsNotADraft()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.Approved));

        var ex = Assert.Throws<InvalidOperationException>(() => service.Submit("INV-1"));
        Assert.Contains("only drafts can be submitted", ex.Message);
    }

    [Fact]
    public void Approve_SetsStatusApproverAndTimestamp()
    {
        var repository = new FakeInvoiceRepository(InvoiceWith("INV-1", InvoiceStatus.PendingApproval));
        var service = new ApprovalService(repository);
        var result = service.Approve("INV-1", "demo.approver");

        Assert.Equal(InvoiceStatus.Approved, result.Status);
        Assert.Equal("demo.approver", result.DecidedBy);
        Assert.NotNull(result.DecidedAt);
        Assert.Equal(InvoiceStatus.Approved, repository.GetById("INV-1")!.Status);
        Assert.Equal("demo.approver", repository.GetById("INV-1")!.DecidedBy);
        Assert.Contains(result, repository.UpdatedInvoices);
    }

    [Fact]
    public void Approve_RejectsInvoiceThatIsStillADraft()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.Draft));

        var ex = Assert.Throws<InvalidOperationException>(() => service.Approve("INV-1", "demo.approver"));
        Assert.Contains("only pending invoices can be decided", ex.Message);
    }

    [Fact]
    public void Approve_ThrowsWhenInvoiceDoesNotExist()
    {
        var service = ServiceFor();

        var ex = Assert.Throws<KeyNotFoundException>(() => service.Approve("INV-404", "demo.approver"));
        Assert.Contains("was not found", ex.Message);
    }

    [Fact]
    public void Reject_RecordsReasonAndApprover()
    {
        var repository = new FakeInvoiceRepository(InvoiceWith("INV-1", InvoiceStatus.PendingApproval));
        var service = new ApprovalService(repository);
        var result = service.Reject("INV-1", "demo.approver", "Duplicate invoice");

        Assert.Equal(InvoiceStatus.Rejected, result.Status);
        Assert.Equal("Duplicate invoice", result.DecisionNote);
        Assert.Equal(InvoiceStatus.Rejected, repository.GetById("INV-1")!.Status);
        Assert.Equal("Duplicate invoice", repository.GetById("INV-1")!.DecisionNote);
        Assert.Contains(result, repository.UpdatedInvoices);
    }

    [Fact]
    public void Reject_RequiresAReason()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.PendingApproval));

        var ex = Assert.Throws<ArgumentException>(() => service.Reject("INV-1", "demo.approver", "  "));
        Assert.Contains("A reason is required", ex.Message);
    }

    [Fact]
    public void Reject_RejectsInvoiceThatIsStillADraft()
    {
        var service = ServiceFor(InvoiceWith("INV-1", InvoiceStatus.Draft));

        var ex = Assert.Throws<InvalidOperationException>(() => service.Reject("INV-1", "demo.approver", "Bad invoice"));
        Assert.Contains("only pending invoices can be decided", ex.Message);
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

    [Fact]
    public void Approve_DirectorWithinLimit_ApprovesSuccessfully()
    {
        var service = ServiceFor(InvoiceWith("INV-D1", InvoiceStatus.PendingApproval, 250000m));
        var result = service.Approve("INV-D1", "demo.director", "Director");

        Assert.Equal(InvoiceStatus.Approved, result.Status);
        Assert.Equal("demo.director", result.DecidedBy);
    }

    [Fact]
    public void Approve_DirectorAtExactBoundary_ApprovesSuccessfully()
    {
        var service = ServiceFor(InvoiceWith("INV-D2", InvoiceStatus.PendingApproval, 500000m));
        var result = service.Approve("INV-D2", "demo.director", "Director");

        Assert.Equal(InvoiceStatus.Approved, result.Status);
        Assert.Equal("demo.director", result.DecidedBy);
    }

    [Fact]
    public void Approve_DirectorExceedingBoundary_ThrowsApprovalLimitExceededException()
    {
        var service = ServiceFor(InvoiceWith("INV-D3", InvoiceStatus.PendingApproval, 500000.01m));

        var ex = Assert.Throws<ApprovalLimitExceededException>(() =>
            service.Approve("INV-D3", "demo.director", "Director"));

        Assert.Contains("Director approval limit exceeded", ex.Message);
        Assert.Contains("500000.00", ex.Message);
    }

    [Fact]
    public void Reject_DirectorWithinLimit_RejectsSuccessfully()
    {
        var service = ServiceFor(InvoiceWith("INV-DR1", InvoiceStatus.PendingApproval, 500000m));
        var result = service.Reject("INV-DR1", "demo.director", "Over budget for project", "Director");

        Assert.Equal(InvoiceStatus.Rejected, result.Status);
        Assert.Equal("demo.director", result.DecidedBy);
        Assert.Equal("Over budget for project", result.DecisionNote);
    }

    [Fact]
    public void Reject_DirectorOverLimit_ThrowsApprovalLimitExceededException()
    {
        var service = ServiceFor(InvoiceWith("INV-DR2", InvoiceStatus.PendingApproval, 500000.01m));

        var ex = Assert.Throws<ApprovalLimitExceededException>(() =>
            service.Reject("INV-DR2", "demo.director", "Too expensive", "Director"));

        Assert.Contains("Director rejection limit exceeded", ex.Message);
        Assert.Contains("500000.00", ex.Message);
    }

    [Fact]
    public void Approve_WhenSameUserAttemptsSecondApproval_ThrowsInvalidOperationExceptionAndInvoiceUnchanged()
    {
        var invoice = InvoiceWith("INV-DUAL-1", InvoiceStatus.PendingApproval, 75000m);
        invoice.Approvers.Add("demo.approver1");
        var repository = new FakeInvoiceRepository(invoice);
        var service = new ApprovalService(repository);

        var ex = Assert.Throws<InvalidOperationException>(() =>
            service.Approve("INV-DUAL-1", "demo.approver1", "Approver"));

        Assert.Equal("The same user may never count as both approvers on one invoice.", ex.Message);

        var repoInvoice = repository.GetById("INV-DUAL-1")!;
        Assert.Equal(InvoiceStatus.PendingApproval, repoInvoice.Status);
        Assert.Null(repoInvoice.DecidedBy);
        Assert.Null(repoInvoice.DecidedAt);
        Assert.Single(repoInvoice.Approvers);
        Assert.Equal("demo.approver1", repoInvoice.Approvers[0]);
    }

    [Fact]
    public void Approve_WhenSameUserAttemptsSecondApprovalWithDifferentCase_ThrowsInvalidOperationException()
    {
        var invoice = InvoiceWith("INV-DUAL-1C", InvoiceStatus.PendingApproval, 75000m);
        invoice.Approvers.Add("demo.approver1");
        var repository = new FakeInvoiceRepository(invoice);
        var service = new ApprovalService(repository);

        var ex = Assert.Throws<InvalidOperationException>(() =>
            service.Approve("INV-DUAL-1C", "DEMO.APPROVER1", "Approver"));

        Assert.Equal("The same user may never count as both approvers on one invoice.", ex.Message);
    }

    [Fact]
    public void Approve_WhenDistinctSecondApproverApproves_TransitionsToApprovedAndRecordsBothApprovers()
    {
        var invoice = InvoiceWith("INV-DUAL-2", InvoiceStatus.PendingApproval, 75000m);
        invoice.Approvers.Add("demo.approver1");
        var repository = new FakeInvoiceRepository(invoice);
        var service = new ApprovalService(repository);

        var result = service.Approve("INV-DUAL-2", "demo.director", "Director");

        Assert.Equal(InvoiceStatus.Approved, result.Status);
        Assert.Equal("demo.director", result.DecidedBy);
        Assert.NotNull(result.DecidedAt);
        Assert.Equal(2, result.Approvers.Count);
        Assert.Equal("demo.approver1", result.Approvers[0]);
        Assert.Equal("demo.director", result.Approvers[1]);

        var repoInvoice = repository.GetById("INV-DUAL-2")!;
        Assert.Equal(InvoiceStatus.Approved, repoInvoice.Status);
        Assert.Equal("demo.director", repoInvoice.DecidedBy);
        Assert.Equal(2, repoInvoice.Approvers.Count);
    }
}
