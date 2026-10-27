/**
 * Domain invoice status lifecycle representation.
 */
export type InvoiceStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'Rejected';

/**
 * Invoice entity data contract matching backend REST models.
 */
export interface Invoice {
  id: string;
  customerName: string;
  amount: number;
  status: InvoiceStatus;
  createdAt: string;
  decidedBy?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
}

/**
 * Request payload for creating a new invoice.
 */
export interface CreateInvoiceRequest {
  customerName: string;
  amount: number;
}

/**
 * Request payload for rejecting an invoice.
 */
export interface RejectInvoiceRequest {
  reason: string;
}
