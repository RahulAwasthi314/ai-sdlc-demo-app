# Research & Design Decisions: Approval Limits by Role

## Decision 1: Domain-Driven Limit Enforcement (Manager & Director)
- **Decision**: Embed role-based approval limits directly inside `InvoiceApp.Domain` (in `ApprovalService.cs` or dedicated `ApprovalRoleLimits`), defining:
  - `ManagerApprovalLimit`: 50,000.00
  - `DirectorApprovalLimit`: 500,000.00
  The user's role and username are supplied to `ApprovalService.Approve` and `ApprovalService.Reject`.
- **Rationale**: Principle III of the constitution requires: "Business rules MUST live in the Domain project; controllers MUST NOT contain business logic." Enforcing both the 50,000 Manager limit and the 500,000 Director limit in the Domain ensures tests can validate boundaries and authority logic purely in unit tests.
- **Alternatives Considered**: 
  - *Controller validation*: Rejected because it violates the constitution and leaks business logic into presentation/API controllers.
  - *ActionFilter attribute*: Rejected because monetary limits require access to the loaded invoice entity and amount from repository.

## Decision 2: Segregation of Duties for Admin Role
- **Decision**: The `Admin` role is strictly restricted from executing `Approve` or `Reject` on business invoices. Invoices must be decided by designated operational roles: `Manager` (up to 50,000), `Director` (up to 500,000), or `Approver`.
- **Rationale**: Confirmed by stakeholder requirements and internal financial controls standards. Administrators manage system configurations, users, and maintenance, but cannot approve financial disbursements.
- **Alternatives Considered**:
  - *Unlimited approval for Admin*: Rejected per explicit governance and constitution requirements.

## Decision 3: Decision Limits Apply to Both Approval and Rejection
- **Decision**: Both `Manager` and `Director` roles have their authority capped for all decision actions (`Approve` and `Reject`) at 50,000.00 and 500,000.00 respectively.
- **Rationale**: An approver cannot make unilateral disposition decisions (including rejection) on invoices exceeding their delegation authority. Invoices above 50,000 must be handled by a Director or higher authority; invoices above 500,000 exceed local authorization limits.
- **Alternatives Considered**:
  - *Allow unlimited rejection*: Rejected because rejecting an invoice is an authoritative determination reserved for authorized budget holders.

## Decision 4: Error Handling and REST Representation
- **Decision**: When a decision exceeds the caller's role limit, `ApprovalService` throws an `ApprovalLimitExceededException` (or `ArgumentException`). Global exception middleware maps this to HTTP `400 Bad Request` with an `ApiErrorDto`:
  ```json
  {
    "error": "Director approval limit exceeded: invoice amount 550000.00 exceeds authorized threshold of 500000.00.",
    "code": "LIMIT_EXCEEDED",
    "status": 400
  }
  ```
- **Rationale**: Conforms to REST guidelines, Constitution Principle VI, and the required `ApiErrorDto` schema.
- **Alternatives Considered**:
  - *HTTP 403 Forbidden*: Rejected because 403 is for endpoint authorization violations; 400 Bad Request with code `LIMIT_EXCEEDED` describes business rule rejection where the user has the Approver role but the resource payload exceeds their delegated financial limit.

## Decision 5: Angular Frontend & Role-Based Navigation
- **Decision**:
  - The Angular frontend (`InvoiceAppFE`) provides:
    - `/invoices` for `Employee` (create and view invoices).
    - `/approvals` for `Manager` and `Director` (view pending invoices, execute Approve/Reject with limits displayed in UI).
  - Role-based route guards (`authGuard`, `roleGuard`) enforce access control.
  - Demo accounts in `appsettings.json` and frontend session:
    - `demo.employee` / `ChangeMe123!` (Role: Employee)
    - `demo.manager` / `ChangeMe123!` (Role: Manager, Limit: $50,000)
    - `demo.director` / `ChangeMe123!` (Role: Director, Limit: $500,000)
    - `demo.admin` / `ChangeMe123!` (Role: Admin)
- **Rationale**: Enforces Constitution Principles I, II, III, and V, ensuring accessible UI with clear limit context and robust route protection.
