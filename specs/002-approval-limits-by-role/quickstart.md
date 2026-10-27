# Quickstart: Validating Approval Limits by Role

## Prerequisites
- .NET 10 SDK installed
- Node.js & Playwright installed in `e2e/`

## 1. Run Unit Tests (Domain Approval Limits)
```bash
dotnet test backend/InvoiceApp.sln
```
Expected output:
- All approval rule tests pass, verifying exact 50,000 threshold, 50,000.01 limit blocks, and Admin segregation of duties.

## 2. Run Playwright E2E Test
```bash
cd e2e
npm test
```
Expected output:
- `rejected-overlimit-approval.spec.ts` executes in Chromium against local web server.
- Verifies that when `demo.manager` attempts to approve an invoice exceeding 50,000, an alert appears explaining the limit exceeded error, and the invoice status remains `PendingApproval`.
