# API Contracts: Approvals & Limits

## 1. Approve Invoice

- **Route**: `POST /api/approvals/{invoiceId}/approve`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Response 200 OK**:
  ```json
  {
    "id": "INV-101",
    "customerName": "Acme Corp",
    "amount": 42000.00,
    "status": "Approved",
    "createdAt": "2026-10-28T02:00:00Z",
    "decidedBy": "demo.manager",
    "decidedAt": "2026-10-28T02:30:00Z",
    "decisionNote": null
  }
  ```
- **Response 400 Bad Request (Limit Exceeded)**:
  ```json
  {
    "error": "Manager approval limit exceeded: invoice amount 65000.00 exceeds authorized threshold of 50000.00.",
    "code": "LIMIT_EXCEEDED",
    "status": 400,
    "details": null
  }
  ```
- **Response 400 Bad Request (Admin Prohibited)**:
  ```json
  {
    "error": "Administrators are not authorized to approve invoices (segregation of duties).",
    "code": "ROLE_NOT_PERMITTED",
    "status": 400,
    "details": null
  }
  ```

---

## 2. Reject Invoice

- **Route**: `POST /api/approvals/{invoiceId}/reject`
- **Headers**:
  - `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "reason": "Duplicate invoice charges"
  }
  ```
- **Response 200 OK**:
  ```json
  {
    "id": "INV-102",
    "customerName": "Beta LLC",
    "amount": 35000.00,
    "status": "Rejected",
    "createdAt": "2026-10-28T02:10:00Z",
    "decidedBy": "demo.manager",
    "decidedAt": "2026-10-28T02:35:00Z",
    "decisionNote": "Duplicate invoice charges"
  }
  ```
- **Response 400 Bad Request (Limit Exceeded)**:
  ```json
  {
    "error": "Manager rejection limit exceeded: invoice amount 75000.00 exceeds authorized handling threshold of 50000.00.",
    "code": "LIMIT_EXCEEDED",
    "status": 400,
    "details": null
  }
  ```
