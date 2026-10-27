# Research & Design Decisions: Approval Limits by Role

## Decision 1: Domain-Driven Limit Enforcement
- **Decision**: Embed role-based approval limits directly inside `InvoiceApp.Domain` (e.g. `ApprovalPolicy` / `ApprovalService`), passing the user's role and identity from the API layer.
- **Rationale**: Principle III of the constitution states: "Business rules MUST live in the Domain project; controllers MUST NOT contain business logic." Enforcing the 50,000 Manager limit in the Domain ensures tests can validate limits purely in memory without spinning up HTTP pipelines.
- **Alternatives Considered**: 
  - *Controller validation*: Rejected because it violates the constitution and leaks business logic into the API presentation layer.
  - *ActionFilter attribute*: Rejected because monetary limits require access to the loaded invoice entity and amount from repository.

## Decision 2: Segregation of Duties for Admin Role
- **Decision**: Admin role is strictly restricted from executing `Approve` or `Reject` on business invoices. Invoices must be approved by designated business operational roles (e.g. `Manager` up to 50,000, or `Approver`).
- **Rationale**: Confirmed by the stakeholder clarification and internal controls auditing standards. Administrators manage configurations and users, but should not sign off on financial disbursements.
- **Alternatives Considered**:
  - *Unlimited approval for Admin*: Rejected per explicit user guidance: "admin should not be authorized to approve invoices".

## Decision 3: Rejection Limit Scope
- **Decision**: Managers are capped at 50,000 for all decision actions (both `Approve` and `Reject`).
- **Rationale**: User clarification confirmed: "manager can only handle till 50000". High-value invoices exceeding 50,000 cannot be decided by a Manager; they must be handled by higher operational tiers.
- **Alternatives Considered**:
  - *Permit Manager to reject any amount*: Rejected per user decision.

## Decision 4: Error Handling and REST Representation
- **Decision**: When a Manager attempts to approve or reject an invoice exceeding 50,000, the service throws an `ArgumentException` (or dedicated `ApprovalLimitExceededException`), which maps to HTTP `400 Bad Request` with an `ApiErrorDto`:
  ```json
  {
    "error": "Manager approval limit exceeded: invoice amount 60000.00 exceeds authorized threshold of 50000.00.",
    "code": "LIMIT_EXCEEDED",
    "status": 400
  }
  ```
- **Rationale**: Conforms to REST guidelines, user clarification choice A3, and the existing `ApiErrorDto` guardrail enforced by the Antigravity lifecycle hook.
- **Alternatives Considered**:
  - *403 Forbidden*: Rejected per clarification selection A3.

## Decision 5: User Interface and E2E Testing
- **Decision**: 
  - Update `backend/src/InvoiceApp.Api/wwwroot/app.js` and `index.html` to support `Manager` role (`demo.manager` credentials added to `appsettings.json`), display role limits in the UI, and present graceful error alerts when approval is denied.
  - Add Playwright Page Objects (`LoginPage`, `InvoicesPage`, `ApprovalsPage`) and a test in `e2e/tests/rejected-overlimit-approval.spec.ts` using role-based locators (`getByRole`, `getByLabel`).
- **Rationale**: Satisfies AGENTS.md and Constitution requirements: E2E tests must use page objects and semantic role locators, zero CSS or XPath selectors.
