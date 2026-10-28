namespace InvoiceApp.Domain;

/// <summary>
/// Moves an invoice through its lifecycle: Draft -> PendingApproval -> Approved or Rejected.
/// Enforces role-based limits (e.g. Manager limit of 50,000, Director limit of 500,000) and segregation of duties.
/// </summary>
public class ApprovalService
{
    public const decimal ManagerApprovalLimit = 50000m;
    public const decimal DirectorApprovalLimit = 500000m;

    private readonly IInvoiceRepository _repository;

    public ApprovalService(IInvoiceRepository repository)
    {
        _repository = repository;
    }

    public Invoice Submit(string invoiceId)
    {
        var invoice = Find(invoiceId);

        if (invoice.Status != InvoiceStatus.Draft)
        {
            throw new InvalidOperationException(
                $"Invoice {invoiceId} is {invoice.Status}; only drafts can be submitted.");
        }

        invoice.Status = InvoiceStatus.PendingApproval;
        _repository.Update(invoice);
        return invoice;
    }

    public Invoice Approve(string invoiceId, string approver, string? role = null)
    {
        var invoice = Find(invoiceId);
        EnsurePending(invoice);
        ValidateDecisionAuthority(invoice, role, "approval");

        invoice.Status = InvoiceStatus.Approved;
        invoice.DecidedBy = approver;
        invoice.DecidedAt = DateTime.UtcNow;
        _repository.Update(invoice);
        return invoice;
    }

    public Invoice Reject(string invoiceId, string approver, string reason, string? role = null)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new ArgumentException("A reason is required to reject an invoice.", nameof(reason));
        }

        var invoice = Find(invoiceId);
        EnsurePending(invoice);
        ValidateDecisionAuthority(invoice, role, "rejection");

        invoice.Status = InvoiceStatus.Rejected;
        invoice.DecidedBy = approver;
        invoice.DecidedAt = DateTime.UtcNow;
        invoice.DecisionNote = reason;
        _repository.Update(invoice);
        return invoice;
    }

    private Invoice Find(string invoiceId) =>
        _repository.GetById(invoiceId)
        ?? throw new KeyNotFoundException($"Invoice {invoiceId} was not found.");

    private static void EnsurePending(Invoice invoice)
    {
        if (invoice.Status != InvoiceStatus.PendingApproval)
        {
            throw new InvalidOperationException(
                $"Invoice {invoice.Id} is {invoice.Status}; only pending invoices can be decided.");
        }
    }

    private static void ValidateDecisionAuthority(Invoice invoice, string? role, string action)
    {
        if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Administrators are not authorized to decide invoices (segregation of duties).");
        }

        if (string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase) && invoice.Amount > ManagerApprovalLimit)
        {
            throw new ApprovalLimitExceededException(
                $"Manager {action} limit exceeded: invoice amount {invoice.Amount:F2} exceeds authorized threshold of {ManagerApprovalLimit:F2}.");
        }

        if (string.Equals(role, "Director", StringComparison.OrdinalIgnoreCase) && invoice.Amount > DirectorApprovalLimit)
        {
            throw new ApprovalLimitExceededException(
                $"Director {action} limit exceeded: invoice amount {invoice.Amount:F2} exceeds authorized threshold of {DirectorApprovalLimit:F2}.");
        }
    }
}
