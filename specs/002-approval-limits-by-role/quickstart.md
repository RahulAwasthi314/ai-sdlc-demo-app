# Quickstart: Validating Approval Limits by Role

## Prerequisites
- .NET 10 SDK installed
- Node.js & Playwright installed in `e2e/`
- Node.js installed in `InvoiceAppFE/`

## 1. Run Backend Unit Tests (Domain Approval Limits)
```bash
dotnet test backend/InvoiceApp.sln
```
Expected output:
- All approval rule tests pass in `ApprovalServiceTests.cs`.
- Verifies:
  - Manager approval & rejection up to 50,000.00 (success).
  - Manager blocked at 50,000.01 (throws `ApprovalLimitExceededException`).
  - Director approval & rejection up to 500,000.00 (success).
  - Director blocked at 500,000.01 (throws `ApprovalLimitExceededException`).
  - Administrator blocked from approving or rejecting (throws segregation of duties error).

## 2. Run Frontend Unit Tests
```bash
cd InvoiceAppFE
npm test
```
Expected output:
- Vitest executes component and guard specs.
- Verifies role guards redirect unauthorized users, and approval components display spending limits.

## 3. Run Playwright E2E Tests
```bash
cd e2e
npm test
```
Expected output:
- Playwright runs in headless Chromium against local web application.
- Verifies that:
  - `demo.manager` can approve <= $50,000, but is blocked with limit error on > $50,000.
  - `demo.director` can approve <= $500,000, but is blocked with limit error on > $500,000.
  - Invoice status remains `PendingApproval` on limit violations.
