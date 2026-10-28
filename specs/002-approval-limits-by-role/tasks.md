---
description: "Task list for Approval Limits by Role (Manager & Director)"
---

# Tasks: Approval Limits by Role & Frontend Architecture

**Input**: Design documents from `specs/002-approval-limits-by-role/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/approvals-api.md](./contracts/approvals-api.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5, US6)
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

**Checkpoint**: All user stories functional and protected by role-based guards.

---

## Phase 9: Polish, Quality Gates & Deliverables

**Purpose**: Cross-cutting quality checks, Stryker mutation testing gate, and constitution deliverables.

- [X] T038 [P] Generate C4 Container diagram in `docs/features/002-approval-limits-by-role/deliverables/c4-container.md`.
- [X] T039 [P] Generate Sequence diagram and UML diagram in `docs/features/002-approval-limits-by-role/deliverables/sequence-and-uml.md`.
- [X] T040 [P] Generate `PRD.md` and `BRD.md` in `docs/features/002-approval-limits-by-role/deliverables/PRD.md` and `docs/features/002-approval-limits-by-role/deliverables/BRD.md`.
- [X] T041 [P] Generate Backend and Frontend Postman Collections with test data sets in `docs/features/002-approval-limits-by-role/deliverables/backend.postman_collection.json` and `docs/features/002-approval-limits-by-role/deliverables/frontend.postman_collection.json`.
- [X] T042 Execute Stryker mutation testing on `InvoiceApp.Domain` and kill all surviving mutants to ensure $\ge$ 80% mutation score.
- [X] T043 Execute full verification suite (`dotnet test backend/InvoiceApp.sln`, `npm test` in `InvoiceAppFE`, `npm test` in `e2e`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User stories can proceed in parallel or sequentially in priority order (P1 $\rightarrow$ P2 $\rightarrow$ P3).
- **Polish & Deliverables (Phase 9)**: Depends on user stories completion.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories.
- **User Story 2 (P1)**: Extends US1 with over-limit error boundary handling.
- **User Story 3 (P1)**: Can proceed in parallel with US1/US2 (Employee invoice submission flow).
- **User Story 4 (P2)**: Depends on US1/US2 (adds Rejection limit checks).
- **User Story 5 (P1)**: Extends US1/US2/US4 (adds Director limit up to 500,000.00).
- **User Story 6 (P3)**: Guards routes for US1, US3, and US5.

### Parallel Opportunities

- Within Phase 1: `T002`, `T003` can run in parallel.
- Within Phase 2: `T005`, `T006`, `T008` can run in parallel.
- User Story 1 & User Story 3 can proceed concurrently across backend and frontend.
- Within each story, test tasks marked `[P]` can be authored in parallel.
- Deliverables tasks `T038`, `T039`, `T040`, `T041` can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup (`T001` - `T003`)
2. Complete Phase 2: Foundational (`T004` - `T008`)
3. Complete Phase 3: User Story 1 (`T009` - `T013`)
4. **STOP and VALIDATE**: Test Manager approvals up to $50,000.00.

### Incremental Delivery
1. Foundation Ready $\rightarrow$ Setup + Foundational
2. Add US1 (Manager Approval $\le$ $50,000$) $\rightarrow$ Test MVP
3. Add US2 (Manager Over-Limit Rejection $\le$ $50,000$) $\rightarrow$ Validate HTTP 400
4. Add US3 (Employee Invoice Application) $\rightarrow$ Validate `/invoices`
5. Add US4 (Manager Rejection with Reason) $\rightarrow$ Validate rejection limits
6. Add US5 (Director Approval $\le$ $500,000$) $\rightarrow$ Validate Director tier
7. Add US6 (Role Route Guards & Segregation of Duties) $\rightarrow$ Validate route protection
8. Execute Phase 9 (Stryker mutation gate $\ge$ 80%, docs deliverables, full regression)
