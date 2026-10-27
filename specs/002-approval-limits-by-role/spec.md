# Feature Specification: Approval Limits by Role

**Feature Branch**: `002-approval-limits-by-role`

**Created**: 2026-10-28

**Status**: Ready for Planning

**Input**: User description: "Add approval limits by role to the invoice approval service in ai-sdlc-demo-app: • A Manager may approve invoices up to 50,000."

## Clarifications

### Session 2026-10-28
- Q: How should the invoice list and pending approvals views be structured in the Angular frontend? → A: Managers can only approve or reject, and employees can only apply for invoices; therefore, these must be separate routes (`/invoices` for employees and `/approvals` for managers), each guarded by role-based Angular route guards.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manager Approves Invoices Within Spending Limit via `/approvals` (Priority: P1)

A user logged in with the Manager role navigates to the dedicated `/approvals` route. The user reviews pending invoices with amounts at or below 50,000. Because the amount is within their authorized spending threshold, the Manager approves the invoice, transitioning its status to Approved and updating the pending list.

**Why this priority**: Core primary requirement enabling Managers to handle business invoices up to their delegation authority without bottlenecks.

**Independent Test**: Can be tested independently by logging in as a Manager, navigating to `/approvals`, and approving an invoice $\le$ 50,000.

**Acceptance Scenarios**:

1. **Given** a pending invoice with an amount of 45,000 on the `/approvals` page, **When** a Manager approves the invoice, **Then** the invoice status becomes Approved and disappears from the pending approvals list.
2. **Given** a pending invoice with an amount of exactly 50,000, **When** a Manager approves the invoice, **Then** the invoice status becomes Approved without error.

---

### User Story 2 - Manager Blocked From Approving Invoice Exceeding Limit (Priority: P1)

A user logged in with the Manager role attempts to approve an invoice on `/approvals` with an amount exceeding 50,000. The system halts the approval, preserves the invoice in its PendingApproval status, and displays a clear, graceful explanation informing the Manager that the amount exceeds their 50,000 limit.

**Why this priority**: Essential financial compliance and internal control safeguard preventing unauthorized expenditure approval.

**Independent Test**: Can be tested independently by attempting to approve a 55,000 invoice as a Manager and verifying that the invoice remains PendingApproval and an HTTP 400 with code `LIMIT_EXCEEDED` is displayed.

**Acceptance Scenarios**:

1. **Given** a pending invoice with an amount of 50,000.01 or greater, **When** a Manager attempts to approve the invoice, **Then** the approval is denied, the invoice remains in PendingApproval status, and a 400 Bad Request error response is returned with code `LIMIT_EXCEEDED`.
2. **Given** an invoice blocked due to exceeding the Manager limit, **When** the error is presented to the user, **Then** the UI displays the limit explanation gracefully without crashing or unhandled faults.

---

### User Story 3 - Employee Views and Applies for Invoices via `/invoices` (Priority: P1)

An employee user navigates to the `/invoices` route. The employee sees the list of all created invoices with their statuses and a reactive form to submit a new invoice application (customer name and amount). When submitted, the draft invoice appears in the list with an option to submit for approval.

**Why this priority**: Core functional capability for invoice applicants to request approvals and track billing lifecycle.

**Independent Test**: Can be tested independently by logging in as an employee, creating an invoice for 15,000, and submitting it for approval on `/invoices`.

**Acceptance Scenarios**:

1. **Given** an employee logged in on `/invoices`, **When** they fill the invoice form and submit, **Then** a new invoice is created with Draft status.
2. **Given** a draft invoice on the `/invoices` page, **When** the employee clicks submit for approval, **Then** the status transitions to PendingApproval.

---

### User Story 4 - Manager Handling Capped at 50,000 for Both Approval and Rejection (Priority: P2)

A user logged in with the Manager role reviews an invoice exceeding 50,000 on `/approvals`. Because Manager authority is strictly capped at 50,000 for decision actions, the Manager cannot approve or reject the invoice; high-value invoices must be escalated or handled by higher operational tiers.

**Why this priority**: Ensures consistent authority delegation: managers only handle invoices within their financial delegation scope.

**Independent Test**: Can be tested independently by having a Manager attempt to reject an 80,000 invoice and verifying that the action is blocked with HTTP 400 and code `LIMIT_EXCEEDED`.

**Acceptance Scenarios**:

1. **Given** a pending invoice with an amount of 50,000 or less, **When** a Manager rejects the invoice with a note, **Then** the invoice status transitions to Rejected.
2. **Given** a pending invoice with an amount exceeding 50,000, **When** a Manager attempts to reject the invoice, **Then** the action is blocked with HTTP 400 `LIMIT_EXCEEDED`.

---

### User Story 5 - Segregation of Duties: Route Guards Enforce Role Separation (Priority: P3)

The application enforces strict separation between employee application tasks and manager approval tasks using Angular Route Guards:
- Managers are blocked from accessing the employee `/invoices` creation route.
- Employees are blocked from accessing the `/approvals` decision route.
- Administrators are blocked from invoice approvals.

**Why this priority**: Enforces audit and regulatory compliance, preventing unauthorized role actions.

**Independent Test**: Can be tested by navigating directly to `/approvals` as an employee and verifying redirection.

**Acceptance Scenarios**:

1. **Given** an employee account, **When** navigating to `/approvals`, **Then** the route guard redirects them to `/invoices` or displays an access denied message.
2. **Given** an unauthenticated session, **When** navigating to `/invoices` or `/approvals`, **Then** the route guard redirects to the login screen.

---

### Edge Cases

- **Exact Limit Boundary**: An invoice with an amount of exactly 50,000.00 MUST be approvable and rejectable by a Manager; an invoice with an amount of 50,000.01 MUST be blocked.
- **Negative or Zero Amounts**: Invoices with zero or negative amounts should not be created or approved without proper validation.
- **Non-Pending Invoices**: Attempting to approve an invoice that is in Draft, Approved, or Rejected status MUST fail with a conflict error (409) before limit validation is evaluated.
- **Missing or Unrecognized Roles**: Users without the Manager role MUST NOT be permitted to invoke approval actions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST enforce a monetary limit of 50,000 for users with the Manager role on invoice decision actions.
- **FR-002**: System MUST permit users with the Manager role to approve pending invoices whose total amount is less than or equal to 50,000.
- **FR-003**: System MUST permit users with the Manager role to reject pending invoices whose total amount is less than or equal to 50,000 with a mandatory reason note.
- **FR-004**: System MUST prevent users with the Manager role from approving or rejecting pending invoices whose total amount exceeds 50,000, leaving the invoice in PendingApproval status.
- **FR-005**: System MUST return HTTP 400 Bad Request wrapped in `ApiErrorDto` with code `LIMIT_EXCEEDED` whenever a Manager attempts to approve or reject an invoice exceeding 50,000, detailing the threshold and the invoice amount.
- **FR-006**: System MUST enforce segregation of duties such that the Admin role is not authorized to approve business invoices.
- **FR-007**: System MUST record the decider identity, role, and timestamp in the invoice audit trail when an approval or rejection succeeds.
- **FR-008**: Frontend Angular application (`InvoiceAppFE`) MUST provide a dedicated `/invoices` route for employee users to create and manage their invoices.
- **FR-009**: Frontend Angular application (`InvoiceAppFE`) MUST provide a dedicated `/approvals` route for manager users to review pending invoices and execute decisions within their 50,000 threshold.
- **FR-010**: Frontend Angular application MUST protect `/invoices` and `/approvals` routes using Angular Route Guards according to authenticated user role.

### Key Entities *(include if feature involves data)*

- **Invoice**: Represents a billing document. Key attributes: `Id`, `CustomerName`, `Amount`, `Status` (Draft, PendingApproval, Approved, Rejected), `CreatedAt`, `DecidedBy`, `DecidedAt`, `DecisionNote`.
- **ApprovalRoleLimit**: Represents the monetary authorization policy. Key attributes: `RoleName` (Manager), `MaxHandlingAmount` (50,000.00).
- **ApiErrorDto**: Generic response representation for errors. Attributes: `Error`, `Code`, `Status`, `Details`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of invoice decision attempts by a Manager for amounts over 50,000 are blocked without changing the invoice status.
- **SC-002**: 100% of invoice approval attempts by a Manager for amounts up to 50,000 succeed on the first attempt when in pending status.
- **SC-003**: Users receive clear, descriptive feedback in under 500ms via `ApiErrorDto` with code `LIMIT_EXCEEDED` when monetary thresholds are exceeded.
- **SC-004**: 100% of protected routes (`/invoices`, `/approvals`) reject unauthorized access attempts according to role permissions.

## Assumptions

- The application uses role-based authentication where users have defined roles such as Employee, Manager, or Admin.
- Single-approver workflow continues to apply (an invoice is decided as a whole by a single authorized user).
- Invoices cannot be partially approved in this increment.
