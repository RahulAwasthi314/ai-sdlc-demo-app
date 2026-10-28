# Sequence and UML Diagrams: Approval Limits by Role

## 1. Sequence Diagram: Over-Limit Approval Rejection

```mermaid
sequenceDiagram
    autonumber
    actor Approver as Manager / Director
    participant UI as Angular SPA / ApprovalsComponent
    participant API as ApprovalsController
    participant Domain as ApprovalService
    participant Repo as InMemoryInvoiceRepository

    Approver->>UI: Click "Approve" (Amount > Role Limit)
    UI->>API: POST /api/approvals/{id}/approve (Bearer Token)
    API->>API: Validate session & RequireRole
    API->>Domain: Approve(invoiceId, username, role)
    Domain->>Repo: GetById(invoiceId)
    Repo-->>Domain: invoice
    Domain->>Domain: ValidateDecisionAuthority(invoice, role, "approval")
    Note over Domain: invoice.Amount > RoleLimit -> throws ApprovalLimitExceededException
    Domain-->>API: ApprovalLimitExceededException
    API-->>UI: HTTP 400 Bad Request { error: "...", code: "LIMIT_EXCEEDED", status: 400 }
    UI->>Approver: Display prominent "Decision Blocked" alert banner
```

## 2. Sequence Diagram: Dual Approver Segregation Rejection

```mermaid
sequenceDiagram
    autonumber
    actor Approver as Same Approver (demo.approver)
    participant UI as Angular SPA / ApprovalsComponent
    participant API as ApprovalsController
    participant Domain as ApprovalService
    participant Repo as InMemoryInvoiceRepository

    Approver->>UI: Click "Approve" (Second Approval Attempt)
    UI->>API: POST /api/approvals/{id}/approve (Bearer Token)
    API->>API: Validate session & RequireRole
    API->>Domain: Approve(invoiceId, username, role)
    Domain->>Repo: GetById(invoiceId)
    Repo-->>Domain: invoice (Approvers contains "demo.approver")
    Domain->>Domain: Check if invoice.Approvers contains username
    Note over Domain: Duplicate approver detected -> throws InvalidOperationException
    Domain-->>API: InvalidOperationException("The same user may never count as both approvers on one invoice.")
    API-->>UI: HTTP 400 Bad Request { error: "The same user may never count as both approvers on one invoice.", code: "SAME_APPROVER_NOT_ALLOWED", status: 400 }
    UI->>Approver: Display prominent "Decision Blocked" alert banner
    Note over Domain,Repo: Invoice state, approvers, and timestamp remain completely unchanged
```

## 3. UML Diagram: Class & Component Structure

```mermaid
classDiagram
    class Invoice {
        +string Id
        +string CustomerName
        +decimal Amount
        +InvoiceStatus Status
        +DateTime CreatedAt
        +string DecidedBy
        +DateTime DecidedAt
        +string DecisionNote
        +List~string~ Approvers
    }

    class InvoiceStatus {
        <<enumeration>>
        Draft
        PendingApproval
        Approved
        Rejected
    }

    class ApprovalService {
        +decimal ManagerApprovalLimit = 50000
        +decimal DirectorApprovalLimit = 500000
        -IInvoiceRepository _repository
        +Submit(invoiceId) Invoice
        +Approve(invoiceId, approver, role) Invoice
        +Reject(invoiceId, approver, reason, role) Invoice
        -ValidateDecisionAuthority(invoice, role, action) void
    }

    class ApprovalLimitExceededException {
        +ApprovalLimitExceededException(message)
    }

    class ApiErrorDto {
        +string Error
        +string Code
        +int Status
        +IReadOnlyList~string~ Details
    }

    ApprovalService ..> Invoice
    ApprovalService ..> InvoiceStatus
    ApprovalService ..> ApprovalLimitExceededException
    Invoice --> InvoiceStatus
```
