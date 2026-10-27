# Tasks: Approval Limits & Role-Separated Frontend UI

**Input**: Design documents from `specs/002-approval-limits-by-role/` (spec.md, plan.md, data-model.md)

## Phase 1: Foundational Core Services & Models
- [X] T001 [P] Create `Invoice` model interface in `InvoiceAppFE/src/app/core/models/invoice.model.ts`
- [X] T002 [P] Create user session model in `InvoiceAppFE/src/app/core/models/user-session.model.ts`
- [X] T003 Implement `AuthService` using Signals in `InvoiceAppFE/src/app/core/services/auth.service.ts`
- [X] T004 Implement `InvoiceService` with REST methods in `InvoiceAppFE/src/app/core/services/invoice.service.ts`
- [X] T005 Implement `authGuard` and `roleGuard` in `InvoiceAppFE/src/app/core/guards/role.guard.ts`

## Phase 2: Employee Invoice Creation & List UI (`/invoices`)
- [X] T006 Create `InvoiceListComponent` with reactive form and invoice table in `InvoiceAppFE/src/app/features/invoices/invoice-list.component.ts`
- [X] T007 Implement template with Angular Material table and form in `InvoiceAppFE/src/app/features/invoices/invoice-list.component.html`
- [X] T008 Add styles in `InvoiceAppFE/src/app/features/invoices/invoice-list.component.scss`

## Phase 3: Manager Pending Approvals & Rejection Reason UI (`/approvals`)
- [X] T009 Create `PendingApprovalsComponent` in `InvoiceAppFE/src/app/features/approvals/pending-approvals.component.ts`
- [X] T010 Implement template with $50,000 threshold notice, approve action, and reject with reason input in `InvoiceAppFE/src/app/features/approvals/pending-approvals.component.html`
- [X] T011 Add styles and alert presentation in `InvoiceAppFE/src/app/features/approvals/pending-approvals.component.scss`

## Phase 4: App Shell, Routing & Login
- [X] T012 Create `LoginComponent` in `InvoiceAppFE/src/app/features/auth/login.component.ts`
- [X] T013 Configure protected routes in `InvoiceAppFE/src/app/app.routes.ts`
- [X] T014 Update root app shell with header and navigation in `InvoiceAppFE/src/app/app.html` and `app.ts`

## Phase 5: Testing & Verification
- [X] T015 Write unit tests for `InvoiceListComponent` in `InvoiceAppFE/src/app/features/invoices/invoice-list.component.spec.ts`
- [X] T016 Write unit tests for `PendingApprovalsComponent` in `InvoiceAppFE/src/app/features/approvals/pending-approvals.component.spec.ts`
- [X] T017 Run and verify full frontend and backend test suites
