# Implementation Plan: Approval Limits by Role (Manager & Director)

**Branch**: `002-approval-limits-by-role` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-approval-limits-by-role/spec.md` (Enforce approval limits: Manager up to 50,000; Director up to 500,000)

## Summary

Enforce multi-tiered role-based approval limits and segregation of duties across both backend and frontend:
1. **Backend (.NET 10)**: 
   - Enforce spending limits in Domain `ApprovalService`: `Manager` up to $50,000.00; `Director` up to $500,000.00.
   - Restrict `Admin` from approving or rejecting business invoices (segregation of duties).
   - Invoices exceeding an approver's threshold reject with HTTP 400 Bad Request mapped to `ApiErrorDto` (`code: LIMIT_EXCEEDED`).
   - Enforce dual-approver segregation: the same user may never count as both approvers on one invoice; duplicate approval attempts reject with HTTP 400 Bad Request mapped to `ApiErrorDto` (`code: SAME_APPROVER_NOT_ALLOWED`), leaving the invoice unchanged.
2. **Frontend (Angular 21 `InvoiceAppFE`)**: 
   - Route `/invoices` for `Employee` (create and view invoices).
   - Route `/approvals` for `Manager` and `Director` (display dynamic spending threshold badges, review pending invoices, approve or reject with reason).
   - Angular route guards (`authGuard`, `roleGuard`) enforce strict separation per Constitution Principle V.
   - Angular Signals, Reactive Forms, and Angular Material components meet WCAG 2.1 AA accessibility.
3. **Verification**: 
   - Backend unit tests with xUnit (`backend/tests/InvoiceApp.Tests`).
   - Frontend unit tests with Vitest (`InvoiceAppFE/src/app`).
   - Mutation testing with Stryker (80% minimum mutation score gate).
   - E2E tests with Playwright (`e2e/tests`) using Page Object Models and role-based locators.

## Technical Context

**Language/Version**: C# 10 / ASP.NET Core (.NET 10), TypeScript 5.4+ / Angular 21

**Primary Dependencies**:
- Backend: `Microsoft.AspNetCore.App`, xUnit
- Frontend: `@angular/core`, `@angular/material`, `@angular/forms`, `@angular/router`, Vitest
- E2E: `@playwright/test`

**Storage**: In-memory repository pattern (`IInvoiceRepository`, `InMemoryInvoiceRepository`)

**Testing**:
- Backend: xUnit (`backend/tests/InvoiceApp.Tests`)
- Frontend: Vitest (`InvoiceAppFE/src/app`)
- Mutation: Stryker .NET (`dotnet-stryker` >= 80% score)
- E2E: Playwright (`e2e/tests`)

**Target Platform**: Cross-platform Web Application (.NET 10 server + Modern browser)

**Project Type**: Fullstack Web Application (ASP.NET Core REST API backend + Angular 21 SPA frontend)

**Performance Goals**: Sub-500ms API response time, instant reactive UI updates via Angular Signals

**Constraints**:
- Strict role limits: Manager <= $50,000; Director <= $500,000; Admin cannot approve.
- Over-limit decisions throw `ApprovalLimitExceededException` mapped to HTTP 400 `LIMIT_EXCEEDED`.
- Constitution compliance: Strict typing (`any` forbidden), 80% test coverage, 80% Stryker mutation gate, zero ESLint/Sonar issues.

**Scale/Scope**: Enterprise invoice approval workflow with 4 standard personas (`Employee`, `Manager`, `Director`, `Admin`).

## Constitution Check

*GATE: All principles verified before Phase 0 research & Phase 1 design.*

- [x] **I. Technology Stack**: Angular 21 (Signals, Reactive Forms, Angular Material) + .NET 10 REST API with in-memory repository.
- [x] **II. Accessibility & Modern Design**: WCAG 2.1 AA compliant UI with ARIA labels, semantic HTML, and responsive layouts.
- [x] **III. Modular Architecture**: Business rules isolated in `InvoiceApp.Domain`; single-responsibility controllers and modular Angular components.
- [x] **IV. Strict Typing & Clean Code**: TypeScript `strict: true`, C# records for DTOs, functions <= 20 lines where possible, no magic numbers.
- [x] **V. Security & Route Protection**: Protected routes (`/invoices`, `/approvals`) behind Angular route guards; backend endpoints protected via `[RequireRole]`.
- [x] **VI. Global Exception Handling**: Normalized error contract `ApiErrorDto` via backend middleware and frontend `apiErrorInterceptor`.
- [x] **VII. Testing Standards**: xUnit for backend, Vitest for frontend, Playwright page objects for E2E, Stryker mutation gate >= 80%.
- [x] **VIII. Documentation & Code Comments**: Crisp 1-2 line block comments; deliverables maintained under `docs/features/002-approval-limits-by-role/deliverables/`.

## Project Structure

### Documentation (this feature)

```text
specs/002-approval-limits-by-role/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── approvals-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code

```text
backend/
├── src/
│   ├── InvoiceApp.Domain/
│   │   ├── ApprovalLimitExceededException.cs  # Domain limit exception
│   │   ├── ApprovalService.cs                 # Domain logic (Manager: 50k, Director: 500k)
│   │   ├── IInvoiceRepository.cs              # Storage contract
│   │   ├── Invoice.cs                         # Entity
│   │   └── InvoiceStatus.cs                   # Lifecycle enum
│   └── InvoiceApp.Api/
│       ├── Auth/                              # Session & Role authorization
│       ├── Controllers/
│       │   ├── ApprovalsController.cs         # Approve/Reject REST endpoints
│       │   └── InvoicesController.cs          # Invoice CRUD endpoints
│       ├── Middleware/
│       │   └── ExceptionMiddleware.cs         # Maps exceptions to ApiErrorDto
│       ├── Models/
│       │   └── ApiErrorDto.cs                 # Generic error schema
│       └── appsettings.json                   # Demo accounts (Manager, Director, Employee, Admin)
└── tests/
    └── InvoiceApp.Tests/
        └── ApprovalServiceTests.cs            # Domain unit tests for limits & boundaries

InvoiceAppFE/
└── src/app/
    ├── core/
    │   ├── models/
    │   │   ├── api-error.dto.ts               # Standard error DTO
    │   │   ├── invoice.model.ts               # Invoice interface
    │   │   └── user-session.model.ts          # Session & roles (Employee, Manager, Director, Admin)
    │   ├── services/
    │   │   ├── auth.service.ts                # Session state & Signals
    │   │   └── invoice.service.ts             # Typed REST methods
    │   ├── guards/
    │   │   ├── auth.guard.ts                  # Route protection
    │   │   └── role.guard.ts                  # Role-based protection
    │   └── interceptors/
    │       └── api-error.interceptor.ts       # Global HTTP error handler
    ├── features/
    │   ├── auth/
    │   │   └── login.component.ts             # Sign in view
    │   ├── invoices/
    │   │   └── invoice-list.component.ts      # Route: /invoices (Employee only)
    │   └── approvals/
    │       └── pending-approvals.component.ts # Route: /approvals (Manager & Director with limit badge)
    ├── app.routes.ts                          # Role-guarded route definitions
    └── app.config.ts                          # Providers and interceptor setup

e2e/
├── pages/
│   ├── LoginPage.ts                           # Playwright POM for authentication
│   ├── InvoicesPage.ts                        # Playwright POM for employee invoices
│   └── ApprovalsPage.ts                       # Playwright POM for manager/director approvals
└── tests/
    └── rejected-overlimit-approval.spec.ts    # Over-limit validation E2E scenarios
```

## Complexity Tracking

*No unjustified constitution violations detected.*

## Step-by-Step Implementation Strategy

1. **Step 1: Domain & Backend Thresholds**:
   - Update `ApprovalService.cs` in `InvoiceApp.Domain`:
     - `ManagerApprovalLimit = 50000m`
     - `DirectorApprovalLimit = 500000m`
     - Enforce `Manager` threshold: Amount <= 50,000 for approve & reject.
     - Enforce `Director` threshold: Amount <= 500,000 for approve & reject.
     - Enforce `Admin` restriction: Segregation of duties error.
   - Update `appsettings.json` in `InvoiceApp.Api` to register `demo.director` account.
   - Add unit tests in `ApprovalServiceTests.cs` for exact boundaries ($50,000.00, $50,000.01, $500,000.00, $500,000.01) and Admin prohibition.

2. **Step 2: API & Controller Configuration**:
   - Update `ApprovalsController.cs` to allow `Director` role alongside `Manager` and `Approver`.
   - Ensure `ExceptionMiddleware.cs` maps `ApprovalLimitExceededException` to HTTP 400 with code `LIMIT_EXCEEDED`.

3. **Step 3: Frontend Data Models & Route Guards**:
   - Update `user-session.model.ts` to include `Director` role.
   - Configure `app.routes.ts` so `/approvals` permits both `Manager` and `Director`.
   - Update `pending-approvals.component.ts` to display dynamic threshold badge based on active user role:
     - Manager: "Approval Limit: $50,000.00"
     - Director: "Approval Limit: $500,000.00"
   - Display graceful UI notification on `LIMIT_EXCEEDED` errors.

4. **Step 4: Quality & Mutation Verification**:
   - Run backend unit tests (`dotnet test backend/InvoiceApp.sln`).
   - Run frontend unit tests (`npm test` in `InvoiceAppFE`).
   - Run Stryker mutation testing and verify mutation score >= 80%.
   - Run Playwright E2E tests (`npm test` in `e2e`).

5. **Step 5: Feature Deliverables**:
   - Maintain C4 container diagram, sequence diagram, UML class diagram, `PRD.md`, `BRD.md`, and Postman collections in `docs/features/002-approval-limits-by-role/deliverables/`.
