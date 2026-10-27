namespace InvoiceApp.Domain;

/// <summary>Thrown when an invoice decision exceeds the user's role authorization limit.</summary>
public class ApprovalLimitExceededException : ArgumentException
{
    public ApprovalLimitExceededException(string message) : base(message)
    {
    }
}
