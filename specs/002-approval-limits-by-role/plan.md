# Implementation Plan: Approval Limits by Role & Frontend List Architecture

**Branch**: `002-approval-limits-by-role` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-approval-limits-by-role/spec.md`

## Summary

Enforce role-based operational segregation across backend and frontend:
1. **Backend (.NET 10)**: Enforces $50,000 threshold on `Manager` decisions, maps errors to generic `ApiErrorDto` (`code: LIMIT_EXCEEDED`), and bars `Admin` from approving invoices.
2. **Frontend (Angular 21 `InvoiceAppFE`)**: Implements role-separated routes:
   - `/invoices` for **Employee** to apply for new invoices and view the invoice list.
   - `/approvals` for **Manager** to view pending approvals, review limit badges ($50,000), approve, or reject with reason.
   - Route guards (`authGuard`, `roleGuard`) enforcing role access per Constitution Principle V.
   - Angular Signals, Reactive Forms, and Angular Material (`mat-table`, `mat-card`, `mat-form-field`).
3. **Static UI & Tests**: Maintains backward compatibility on static web UI and validates via xUnit, Vitest, and Playwright E2E.

## Technical Context

**Language/Version**: C# 10 / ASP.NET Core (.NET 10), TypeScript 5+ / Angular 21

**Primary Dependencies**:
- Backend: Microsoft.AspNetCore.App, xUnit
- Frontend: `@angular/core`, `@angular/material`, `@angular/forms`, `@angular/router`, Vitest
- E2E: `@playwright/test`

**Testing**:
- Backend: xUnit (`backend/tests/InvoiceApp.Tests`)
- Frontend: Vitest (`InvoiceAppFE/src/app`)
- E2E: Playwright (`e2e/tests`)

**Constraints**:
- Strict role separation: Employee creates/views invoices (`/invoices`); Manager approves/rejects up to $50,000 (`/approvals`).
- Constitution compliance: ARIA accessibility, Angular Material styling, Signals for reactive state, 0 raw errors.

## Constitution Check

- [x] **Technology Stack**: Angular 21 (Signals, Reactive Forms, Angular Material) + .NET 10 REST API.
- [x] **Accessibility & Modern Design**: WCAG 2.1 AA compliant components (`mat-table`, semantic buttons, ARIA labels).
- [x] **Modular Architecture**: Self-contained feature components (`InvoiceListComponent`, `PendingApprovalsComponent`).
- [x] **Route Protection**: `/invoices` and `/approvals` guarded by Angular route guards; only `/` is public.
- [x] **Centralized Exception Handling**: `apiErrorInterceptor` normalizes all errors into `ApiErrorDto`.
- [x] **Testing Standards**: Vitest for Angular frontend, xUnit for .NET backend, Playwright E2E tests.

## Planned Frontend List & Component Layout

```text
InvoiceAppFE/src/app/
├── core/
│   ├── models/
│   │   ├── api-error.dto.ts             # Standard error DTO
│   │   ├── invoice.model.ts             # Invoice entity interface
│   │   └── user-session.model.ts        # User session & roles
│   ├── services/
│   │   ├── auth.service.ts              # Authentication & role Signals
│   │   └── invoice.service.ts           # Invoice CRUD & approval API calls
│   ├── guards/
│   │   ├── auth.guard.ts                # Redirects unauthenticated users
│   │   └── role.guard.ts                # Restricts routes by role
│   └── interceptors/
│       └── api-error.interceptor.ts     # Global HTTP error normalizer
├── features/
│   ├── auth/
│   │   └── login.component.ts           # Sign in view
│   ├── invoices/
│   │   └── invoice-list.component.ts    # Route: /invoices (Employee only)
│   └── approvals/
│       └── pending-approvals.component.ts # Route: /approvals (Manager only)
├── app.routes.ts                        # Route configuration with guards
├── app.config.ts                        # Material & HTTP configuration
└── app.html                             # Root shell with navbar & router-outlet
```

## Step-by-Step Implementation Strategy

1. **Step 1: Core Models & Services**:
   - Define `Invoice` interface (`id`, `customerName`, `amount`, `status`, `decidedBy`, `decidedAt`, `decisionNote`).
   - Implement `AuthService` with Signals (`currentUser`, `role`, `isAuthenticated`).
   - Implement `InvoiceService` with typed REST methods.
2. **Step 2: Role Route Guards**:
   - Create functional `authGuard` and `roleGuard` verifying session role and redirecting unauthorized requests.
3. **Step 3: Employee Invoice List Component (`/invoices`)**:
   - Reactive Form for invoice creation (`customerName`, `amount`).
   - Angular Material table (`mat-table`) showing invoices and "Submit for Approval" button for drafts.
4. **Step 4: Manager Pending Approvals Component (`/approvals`)**:
   - Displays Manager spending limit banner: `Manager Approval Limit: $50,000.00`.
   - Lists pending invoices with Approve and Reject actions.
   - Rejection requires reason input.
   - Shows graceful alert on boundary rejection (`ApiErrorDto.error`).
5. **Step 5: Testing & Verification**:
   - Unit test guards and components with Vitest (`npm test` in `InvoiceAppFE`).
   - Verify build bundle (`npm run build`).
