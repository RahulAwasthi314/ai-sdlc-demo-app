---
description: "Task list for Approval Limits by Role & Dual Approver Segregation"
---

# Tasks: Approval Limits by Role & Frontend Architecture

**Input**: Design documents from `specs/002-approval-limits-by-role/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/approvals-api.md](./contracts/approvals-api.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5, US6, US7)
- File paths are exact repository-relative paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic configuration for roles and error contracts

- [X] T001 Configure backend demo accounts in `backend/src/InvoiceApp.Api/appsettings.json` with `demo.employee`, `demo.manager`, `demo.director`, and `demo.admin` credentials.
- [X] T002 [P] Define `ApiErrorDto` schema with properties `error: string` (required), `code?: string`, `status?: int`, `details?: IReadOnlyList<string>` in `backend/src/InvoiceApp.Api/Models/ApiErrorDto.cs`.
- [X] T003 [P] Define TypeScript frontend interfaces `ApiErrorDto`, `Invoice`, and `UserSession` in `InvoiceAppFE/src/app/core/models/api-error.dto.ts`, `InvoiceAppFE/src/app/core/models/invoice.model.ts`, and `InvoiceAppFE/src/app/core/models/user-session.model.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [X] T004 Implement domain exception `ApprovalLimitExceededException` inheriting from `Exception` in `backend/src/InvoiceApp.Domain/ApprovalLimitExceededException.cs`.
- [X] T005 [P] Implement `ExceptionMiddleware` in `backend/src/InvoiceApp.Api/Middleware/ExceptionMiddleware.cs` mapping `ApprovalLimitExceededException` to HTTP 400 Bad Request with `code: LIMIT_EXCEEDED` and `error` description.
- [X] T006 [P] Implement `ApiErrorInterceptor` in `InvoiceAppFE/src/app/core/interceptors/api-error.interceptor.ts` normalizing HTTP error responses into `ApiErrorDto`.
- [X] T007 Implement `AuthService` in `InvoiceAppFE/src/app/core/services/auth.service.ts` managing user session Signals (`currentUser`, `role: 'Employee' | 'Manager' | 'Director' | 'Admin'`, `isAuthenticated`).
- [X] T008 [P] Implement `InvoiceService` in `InvoiceAppFE/src/app/core/services/invoice.service.ts` providing typed REST client methods for invoices and approvals.

**Checkpoint**: Core foundation ready - user story implementation can begin.

---

## Phase 3: User Story 1 - Manager Approves Invoices Within Spending Limit via `/approvals` (Priority: P1) 🎯 MVP

**Goal**: A Manager logs in, navigates to `/approvals`, reviews pending invoices with amount $\le$ 50,000.00, and approves them, transitioning status to `Approved`.

**Independent Test**: Log in as `demo.manager`, navigate to `/approvals`, approve invoice with amount $\le$ 50,000.00; verify status changes to `Approved` and invoice disappears from pending list.

### Tests for User Story 1
- [X] T009 [P] [US1] Create unit tests in `backend/tests/InvoiceApp.Tests/ApprovalServiceTests.cs` verifying Manager can approve invoices with amount 45,000.00 and boundary amount 50,000.00.

### Implementation for User Story 1
- [X] T010 [US1] Implement Manager threshold enforcement (`ManagerApprovalLimit = 50000m`) in `ApprovalService.Approve` in `backend/src/InvoiceApp.Domain/ApprovalService.cs` setting `Status = InvoiceStatus.Approved`, `DecidedBy`, and `DecidedAt`.
- [X] T011 [US1] Implement `POST /api/approvals/{invoiceId}/approve` endpoint handling in `backend/src/InvoiceApp.Api/Controllers/ApprovalsController.cs` resolving user identity and role from session and passing to `ApprovalService`.
- [X] T012 [US1] Implement `PendingApprovalsComponent` in `InvoiceAppFE/src/app/features/approvals/pending-approvals.component.ts` displaying pending invoices in Angular Material `mat-table` with limit badge `Manager Approval Limit: $50,000.00` and `Approve` button.
- [X] T013 [P] [US1] Write Vitest component unit tests for `PendingApprovalsComponent` in `InvoiceAppFE/src/app/features/approvals/pending-approvals.component.spec.ts`.

**Checkpoint**: User Story 1 fully functional and testable independently.

---

## Phase 4: User Story 2 - Manager Blocked From Approving Invoice Exceeding Limit (Priority: P1)

**Goal**: Manager attempting to approve invoices exceeding 50,000.00 is blocked with HTTP 400 Bad Request `LIMIT_EXCEEDED` while invoice status remains `PendingApproval`.

**Independent Test**: Attempt to approve invoice of 50,000.01 as Manager; verify HTTP 400 with code `LIMIT_EXCEEDED` is returned and UI displays error alert gracefully.

### Tests for User Story 2
- [X] T014 [P] [US2] Create unit tests in `backend/tests/InvoiceApp.Tests/ApprovalServiceTests.cs` verifying Manager approval is blocked at 50,000.01 throwing `ApprovalLimitExceededException` with code `LIMIT_EXCEEDED` and status remains `PendingApproval`.

### Implementation for User Story 2
- [X] T015 [US2] Update `ApprovalService.ValidateDecisionAuthority` in `backend/src/InvoiceApp.Domain/ApprovalService.cs` ensuring amounts strictly exceeding `ManagerApprovalLimit` throw `ApprovalLimitExceededException` with message `Manager approval limit exceeded: invoice amount {amount:F2} exceeds authorized threshold of {ManagerApprovalLimit:F2}.`.
- [X] T016 [US2] Add graceful error alert handling in `InvoiceAppFE/src/app/features/approvals/pending-approvals.component.ts` displaying `ApiErrorDto.error` message when `LIMIT_EXCEEDED` occurs without breaking UI state.
- [X] T017 [P] [US2] Create Playwright Page Object `ApprovalsPage` in `e2e/pages/ApprovalsPage.ts` and E2E test in `e2e/tests/rejected-overlimit-approval.spec.ts` verifying over-limit alert display using `getByRole`.

**Checkpoint**: User Stories 1 and 2 functional together.

---

## Phase 5: User Story 3 - Employee Views and Applies for Invoices via `/invoices` (Priority: P1)

**Goal**: An Employee navigates to `/invoices`, views the invoice list, and uses a reactive form to submit new invoice applications transitioning them from `Draft` to `PendingApproval`.

**Independent Test**: Log in as `demo.employee`, create an invoice for 15,000 via reactive form, verify status `Draft`, submit for approval, and verify status transitions to `PendingApproval`.

### Tests for User Story 3
- [X] T018 [P] [US3] Add unit tests in `backend/tests/InvoiceApp.Tests/InvoicesControllerTests.cs` for invoice creation and submission for approval by Employee role.

### Implementation for User Story 3
- [X] T019 [US3] Ensure `InvoicesController.cs` in `backend/src/InvoiceApp.Api/Controllers/InvoicesController.cs` exposes `POST /api/invoices` (create) and `POST /api/invoices/{id}/submit` (submit for approval).
- [X] T020 [US3] Implement `InvoiceListComponent` in `InvoiceAppFE/src/app/features/invoices/invoice-list.component.ts` with Reactive Form (`customerName` required string, `amount` required decimal > 0), Angular Material table, and "Submit for Approval" action button.
- [X] T021 [P] [US3] Add Vitest unit tests in `InvoiceAppFE/src/app/features/invoices/invoice-list.component.spec.ts` testing reactive form validation and table rendering.
- [X] T022 [P] [US3] Create Playwright Page Object `InvoicesPage` in `e2e/pages/InvoicesPage.ts` verifying employee invoice creation and submission journey.

**Checkpoint**: User Stories 1, 2, and 3 functional independently.

---

## Phase 6: User Story 4 - Manager Handling Capped at 50,000 for Both Approval and Rejection (Priority: P2)

**Goal**: Manager authority is capped at 50,000.00 for all decision actions. Manager can reject pending invoices $\le$ 50,000.00 with mandatory reason note, but is blocked from rejecting invoices > 50,000.00.

**Independent Test**: Attempt to reject 80,000 invoice as Manager; verify HTTP 400 `LIMIT_EXCEEDED`. Reject 30,000 invoice with reason "Duplicate charge"; verify status `Rejected` and `DecisionNote` populated.

### Tests for User Story 4
- [X] T023 [P] [US4] Add unit tests in `backend/tests/InvoiceApp.Tests/ApprovalServiceTests.cs` verifying Manager rejection $\le$ 50,000 succeeds with note and > 50,000 throws `ApprovalLimitExceededException`.

### Implementation for User Story 4
- [X] T024 [US4] Enforce Manager threshold validation on `ApprovalService.Reject` in `backend/src/InvoiceApp.Domain/ApprovalService.cs` requiring non-empty `reason` and verifying invoice amount $\le$ `ManagerApprovalLimit`.
- [X] T025 [US4] Implement `POST /api/approvals/{invoiceId}/reject` endpoint in `backend/src/InvoiceApp.Api/Controllers/ApprovalsController.cs` accepting `{ "reason": string }` record.
- [X] T026 [US4] Add rejection dialog with mandatory reason input in `InvoiceAppFE/src/app/features/approvals/pending-approvals.component.ts`.

**Checkpoint**: Manager approval and rejection limits fully functional.

---

## Phase 7: User Story 5 - Director Approves Invoices Up To 500,000 via `/approvals` (Priority: P1)

**Goal**: A Director navigates to `/approvals` and can approve or reject pending invoices with amounts up to 500,000.00. Decision actions exceeding 500,000.00 are blocked with HTTP 400 `LIMIT_EXCEEDED`.

**Independent Test**: Log in as `demo.director`, approve invoice of 250,000 (status becomes `Approved`), approve invoice of 500,000 (status becomes `Approved`), and attempt to approve invoice of 500,000.01 (blocked with HTTP 400 `LIMIT_EXCEEDED`).

### Tests for User Story 5
- [X] T027 [P] [US5] Add unit tests in `backend/tests/InvoiceApp.Tests/ApprovalServiceTests.cs` testing Director approvals and rejections at boundary amounts: 250,000.00 (success), 500,000.00 (success), and 500,000.01 (throws `ApprovalLimitExceededException`).

### Implementation for User Story 5
- [X] T028 [US5] Implement `DirectorApprovalLimit = 500000m` and evaluation logic in `ApprovalService.ValidateDecisionAuthority` in `backend/src/InvoiceApp.Domain/ApprovalService.cs` checking role `Director` against `DirectorApprovalLimit`.
- [X] T029 [US5] Update `ApprovalsController.cs` in `backend/src/InvoiceApp.Api/Controllers/ApprovalsController.cs` allowing `Director` role on approval and rejection endpoints.
- [X] T030 [US5] Update `PendingApprovalsComponent` in `InvoiceAppFE/src/app/features/approvals/pending-approvals.component.ts` to dynamically show `Director Approval Limit: $500,000.00` badge when logged in as Director.
- [X] T031 [P] [US5] Add Vitest unit test in `InvoiceAppFE/src/app/features/approvals/pending-approvals.component.spec.ts` verifying Director limit badge rendering and over-500k alert handling.
- [X] T032 [P] [US5] Add Playwright E2E test in `e2e/tests/director-approval-limits.spec.ts` testing Director approval up to $500,000 and rejection beyond $500,000.

**Checkpoint**: Director approval threshold and error handling fully functional.

---

## Phase 8: User Story 6 - Segregation of Duties: Route Guards Enforce Role Separation (Priority: P3)

**Goal**: Angular route guards enforce strict separation: Employee blocked from `/approvals`, Manager/Director blocked from `/invoices`, Admin blocked from invoice decisions, and unauthenticated redirected to `/login`.

**Independent Test**: Navigate to `/approvals` as Employee -> redirected to `/invoices`; navigate to `/invoices` as Manager -> redirected to `/approvals`; attempt approving as Admin -> HTTP 400 `ROLE_NOT_PERMITTED`.

### Tests for User Story 6
- [X] T033 [P] [US6] Add unit tests in `backend/tests/InvoiceApp.Tests/ApprovalServiceTests.cs` verifying Admin role is barred from deciding invoices, throwing segregation of duties exception.

### Implementation for User Story 6
- [X] T034 [US6] Implement `AuthGuard` in `InvoiceAppFE/src/app/core/guards/auth.guard.ts` redirecting unauthenticated users to `/login`.
- [X] T035 [US6] Implement `RoleGuard` in `InvoiceAppFE/src/app/core/guards/role.guard.ts` validating user role against route data (`roles: ['Employee']` for `/invoices`, `roles: ['Manager', 'Director']` for `/approvals`).
- [X] T036 [US6] Configure guarded route paths in `InvoiceAppFE/src/app/app.routes.ts` protecting `/invoices` and `/approvals`.
- [X] T037 [P] [US6] Add Vitest unit tests in `InvoiceAppFE/src/app/core/guards/role.guard.spec.ts` verifying unauthorized route redirections.

---

## Phase 9: User Story 7 - Dual Approver Segregation: Same User Cannot Be Both Approvers (Priority: P2)

**Goal**: The same user may never count as both approvers on one invoice. When a multi-approval invoice requires two approvers, a second approval attempt by the first approver is rejected with a clear reason (`SAME_APPROVER_NOT_ALLOWED`), and nothing about the invoice changes.

**Independent Test**: Create an invoice with initial approval by `demo.approver1`. Attempt second approval with `demo.approver1`. Verify HTTP 400 Bad Request with code `SAME_APPROVER_NOT_ALLOWED` is returned, and invoice state, timestamp, and existing approver remain unchanged.

### Tests for User Story 7
- [X] T044 [P] [US7] Add unit tests in `backend/tests/InvoiceApp.Tests/ApprovalServiceTests.cs` verifying that when a second approval is attempted by the same user who provided the first approval, `InvalidOperationException` is thrown with message "The same user may never count as both approvers on one invoice.", and verifying that status, timestamp, and existing approver remain completely unchanged.
- [X] T045 [P] [US7] Add unit test in `backend/tests/InvoiceApp.Tests/ApprovalServiceTests.cs` verifying that when a second approval is provided by a distinct authorized approver, the invoice successfully transitions to fully `Approved` with both approvers recorded.

### Implementation for User Story 7
- [X] T046 [US7] Update `Invoice` domain entity in `backend/src/InvoiceApp.Domain/Invoice.cs` to add `List<string> Approvers` for multi-approver tracking, defaulting to an empty list.
- [X] T047 [US7] Update `ApprovalService.Approve` in `backend/src/InvoiceApp.Domain/ApprovalService.cs` to enforce the dual-approval segregation check: if `invoice.Approvers.Contains(approver)`, throw `InvalidOperationException` with reason "The same user may never count as both approvers on one invoice." before modifying any invoice properties.
- [X] T048 [US7] Update `GlobalExceptionMiddleware.cs` in `backend/src/InvoiceApp.Api/Middleware/GlobalExceptionMiddleware.cs` and `ApiControllerBase.cs` to map "The same user may never count as both approvers on one invoice." to HTTP 400 Bad Request with `code: SAME_APPROVER_NOT_ALLOWED`.
- [X] T049 [P] [US7] Add Vitest unit test in `InvoiceAppFE/src/app/features/approvals/pending-approvals.component.spec.ts` verifying that when an approval returns `SAME_APPROVER_NOT_ALLOWED`, the error is rendered gracefully in the alert banner and the pending invoice list item is preserved.
- [X] T050 [P] [US7] Create Playwright E2E test in `e2e/tests/dual-approver-segregation.spec.ts` verifying that attempting a duplicate approval by the same user triggers the error banner and leaves the invoice in pending state.

**Checkpoint**: Dual-approver segregation fully functional, tested, and protected against duplicate sign-offs.

---

## Phase 10: Polish, Quality Gates & Deliverables

**Purpose**: Cross-cutting quality checks, Stryker mutation testing gate, and constitution deliverables.

- [X] T038 [P] Generate C4 Container diagram in `docs/features/002-approval-limits-by-role/deliverables/c4-container.md`.
- [X] T039 [P] Generate Sequence diagram and UML diagram in `docs/features/002-approval-limits-by-role/deliverables/sequence-and-uml.md`.
- [X] T040 [P] Generate `PRD.md` and `BRD.md` in `docs/features/002-approval-limits-by-role/deliverables/PRD.md` and `docs/features/002-approval-limits-by-role/deliverables/BRD.md`.
- [X] T041 [P] Generate Backend and Frontend Postman Collections with test data sets in `docs/features/002-approval-limits-by-role/deliverables/backend.postman_collection.json` and `docs/features/002-approval-limits-by-role/deliverables/frontend.postman_collection.json`.
- [X] T042 Execute Stryker mutation testing on `InvoiceApp.Domain` and kill all surviving mutants to ensure $\ge$ 80% mutation score.
- [X] T043 Execute full verification suite (`dotnet test backend/InvoiceApp.sln`, `npm test` in `InvoiceAppFE`, `npm test` in `e2e`).
- [X] T051 [P] Update Sequence and UML diagrams in `docs/features/002-approval-limits-by-role/deliverables/sequence-and-uml.md` to reflect dual approver rejection and state preservation.
- [X] T052 [P] Update `PRD.md` and `BRD.md` in `docs/features/002-approval-limits-by-role/deliverables/` to document the dual approver segregation rule and KPIs.
- [X] T053 [P] Add dual approver test scenario to `backend.postman_collection.json` in `docs/features/002-approval-limits-by-role/deliverables/backend.postman_collection.json`.
- [X] T054 Execute Stryker mutation testing on `InvoiceApp.Domain` ensuring $\ge$ 80% mutation score on new multi-approver validation logic.
- [X] T055 Run full regression verification across backend, frontend, and E2E test suites.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Completed `[X]`.
- **Foundational (Phase 2)**: Completed `[X]`.
- **User Stories 1 - 6 (Phases 3 - 8)**: Completed `[X]`.
- **User Story 7 (Phase 9)**: Depends on Foundational & Core ApprovalService (`T044` $\rightarrow$ `T050`).
- **Phase 10 (Polish & Quality Gates)**: Depends on User Story 7 completion.

### Within User Story 7
- `T044`, `T045`: Unit tests written first and verified failing before implementation.
- `T046`: Domain model update (`Invoice.cs`).
- `T047`: Domain logic implementation (`ApprovalService.cs`).
- `T048`: API exception mapping.
- `T049`: Frontend unit test.
- `T050`: Playwright E2E scenario.

### Parallel Opportunities
- `T044`, `T045` unit tests can run in parallel.
- `T049` (Vitest) and `T050` (Playwright) can be authored in parallel once domain logic is implemented.
- `T051`, `T052`, `T053` documentation tasks can run concurrently.

---

## Implementation Strategy

### Incremental Delivery for User Story 7
1. Write negative test `T044` (same user second approval attempt $\rightarrow$ throws error, invoice unchanged) and positive test `T045` (distinct second approver $\rightarrow$ approved).
2. Update `Invoice.cs` (`T046`) and `ApprovalService.cs` (`T047`).
3. Wire API mapping (`T048`).
4. Validate frontend error handling (`T049`) and E2E flow (`T050`).
5. Run Stryker mutation gate (`T054`) and full regression test suite (`T055`).
