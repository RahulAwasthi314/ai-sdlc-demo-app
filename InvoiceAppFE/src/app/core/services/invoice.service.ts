import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Invoice, CreateInvoiceRequest, RejectInvoiceRequest } from '../models/invoice.model';

/**
 * Service managing invoice operations, submission, and approval decisions.
 */
@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private readonly http = inject(HttpClient);

  private readonly invoicesState = signal<Invoice[]>([]);
  readonly invoices = this.invoicesState.asReadonly();

  loadInvoices(): Observable<Invoice[]> {
    return this.http.get<Invoice[]>('/api/invoices').pipe(
      tap((invoices) => this.invoicesState.set(invoices))
    );
  }

  createInvoice(request: CreateInvoiceRequest): Observable<Invoice> {
    return this.http.post<Invoice>('/api/invoices', request).pipe(
      tap((newInvoice) => {
        this.invoicesState.update((current) => [...current, newInvoice]);
      })
    );
  }

  submitInvoice(invoiceId: string): Observable<Invoice> {
    return this.http.post<Invoice>(`/api/invoices/${invoiceId}/submit`, {}).pipe(
      tap((updated) => {
        this.invoicesState.update((current) =>
          current.map((inv) => (inv.id === updated.id ? updated : inv))
        );
      })
    );
  }

  approveInvoice(invoiceId: string): Observable<Invoice> {
    return this.http.post<Invoice>(`/api/approvals/${invoiceId}/approve`, {}).pipe(
      tap((updated) => {
        this.invoicesState.update((current) =>
          current.map((inv) => (inv.id === updated.id ? updated : inv))
        );
      })
    );
  }

  rejectInvoice(invoiceId: string, reason: string): Observable<Invoice> {
    const payload: RejectInvoiceRequest = { reason };
    return this.http.post<Invoice>(`/api/approvals/${invoiceId}/reject`, payload).pipe(
      tap((updated) => {
        this.invoicesState.update((current) =>
          current.map((inv) => (inv.id === updated.id ? updated : inv))
        );
      })
    );
  }
}
