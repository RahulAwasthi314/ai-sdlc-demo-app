# Data Model: Approval Limits by Role

## Entities

### 1. Invoice (Domain Entity)
- **Path**: `backend/src/InvoiceApp.Domain/Invoice.cs`
- **Fields**:
  - `Id`: string (Unique invoice identifier, e.g. `INV-001`)
  - `CustomerName`: string (Billing customer name)
  - `Amount`: decimal (Monetary value in standard currency)
  - `Status`: `InvoiceStatus` enum (`Draft`, `PendingApproval`, `Approved`, `Rejected`)
  - `CreatedAt`: DateTime (Creation timestamp)
  - `DecidedBy`: string? (Username of approving or rejecting user)
  - `DecidedAt`: DateTime? (Timestamp of decision)
  - `DecisionNote`: string? (Rejection reason or approval commentary)

### 2. ApprovalRoleLimits (Domain Policy / Configuration)
- **Path**: `backend/src/InvoiceApp.Domain/ApprovalLimits.cs`
- **Specification**:
  - `Role`: string (`Manager`, `Approver`, `Admin`)
  - `MaxHandlingAmount`: decimal? (50,000.00 for `Manager`, null/unlimited for authorized executive approvers)
  - `CanApprove`: bool (`true` for `Manager`, `Approver`; `false` for `Admin`)
  - `CanReject`: bool (`true` for `Manager`, `Approver`; `false` for `Admin`)

### 3. ApiErrorDto (API Contract)
- **Path**: `backend/src/InvoiceApp.Api/Models/ApiErrorDto.cs`
- **Fields**:
  - `Error`: string (Human-readable error description)
  - `Code`: string? (Machine-readable code, e.g. `LIMIT_EXCEEDED`, `UNAUTHORIZED`, `CONFLICT`)
  - `Status`: int? (HTTP status code, e.g. 400)
  - `Details`: IReadOnlyList<string>? (Optional supplemental diagnostic info)

## State Lifecycle & Transitions

```text
[Draft]
   │
   │  Submit(invoiceId)
   ▼
[PendingApproval]
   ├── (Amount <= 50,000 && Role == Manager) ── Approve ──▶ [Approved]
   ├── (Amount <= 50,000 && Role == Manager) ── Reject  ──▶ [Rejected]
   ├── (Amount > 50,000 && Role == Manager)  ── Decision Denied (throws LIMIT_EXCEEDED, remains PendingApproval)
   └── (Role == Admin)                       ── Decision Denied (throws UNAUTHORIZED_ROLE, remains PendingApproval)
```
