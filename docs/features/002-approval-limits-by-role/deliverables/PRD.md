# Product Requirements Document (PRD)

## Feature: Approval Limits by Role (Manager & Director)
- **Target Release**: v1.1.0
- **Feature Branch**: `002-approval-limits-by-role`
- **Owner**: Invoice App Product & Engineering Team

### 1. Objective
Introduce tiered, role-based approval limits in the invoice lifecycle to prevent unauthorized high-value commitments while removing operational bottlenecks:
- **Manager**: Authority capped at **$50,000.00** for both approval and rejection.
- **Director**: Authority capped at **$500,000.00** for both approval and rejection.
- **Admin**: Strictly prohibited from deciding business invoices (segregation of duties).
- **Employee**: Can view invoices and submit draft invoices on a dedicated `/invoices` route.

### 2. User Personas
1. **Employee (`demo.employee`)**: Originates invoices and submits for review.
2. **Manager (`demo.manager`)**: Reviews pending invoices $\le$ $50,000.
3. **Director (`demo.director`)**: Reviews pending invoices $\le$ $500,000.
4. **Administrator (`demo.admin`)**: Manages technical configurations; barred from financial sign-offs.

### 3. Requirements & Scenarios
- **FR-01**: Monetary limit of $50,000 for Manager role on approval/rejection.
- **FR-02**: Monetary limit of $500,000 for Director role on approval/rejection.
- **FR-03**: Consistent error reporting returning HTTP 400 with `ApiErrorDto` and code `LIMIT_EXCEEDED`.
- **FR-04**: Angular route guards ensuring role-segregated navigation.
- **FR-05**: Audit trail capturing approver username, role, and timestamp upon approval or rejection.

