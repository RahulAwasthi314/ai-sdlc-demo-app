import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { InvoiceService } from '../../core/services/invoice.service';
import { AuthService } from '../../core/services/auth.service';
import { Invoice } from '../../core/models/invoice.model';
import { ApiErrorDto } from '../../core/models/api-error.dto';

/**
 * Component for managers and directors to review pending invoices, execute approvals within threshold,
 * or reject invoices with a mandatory reason note.
 */
@Component({
  selector: 'app-pending-approvals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
  ],
  template: `
    <div class="approvals-layout">
      <!-- Header Banner with Role Limits -->
      <mat-card class="limit-card">
        <div class="limit-header">
          <div class="role-badge">
            <span class="role-label">{{ userRole() || 'Approver' }}</span>
            <span class="threshold-badge">
              @if (userRole() === 'Manager') {
                Authorized Limit: $50,000.00
              } @else if (userRole() === 'Director') {
                Authorized Limit: $500,000.00
              } @else {
                Authorized Limit: Executive / Unlimited
              }
            </span>
          </div>
          <div class="limit-caption">
            @if (userRole() === 'Manager') {
              Invoices exceeding $50,000.00 cannot be approved or rejected by Managers and require executive sign-off.
            } @else if (userRole() === 'Director') {
              Invoices exceeding $500,000.00 cannot be approved or rejected by Directors and require executive sign-off.
            } @else {
              Authorized to decide pending business invoices.
            }
          </div>
        </div>
      </mat-card>

      <!-- Decision Error & Success Feedback Banners -->
      @if (decisionError()) {
        <div class="alert-banner error" role="alert" aria-live="assertive">
          <mat-icon class="alert-icon">warning</mat-icon>
          <div class="alert-content">
            <strong>Decision Blocked:</strong> {{ decisionError() }}
          </div>
        </div>
      }

      @if (successMessage()) {
        <div class="alert-banner success" role="status" aria-live="polite">
          <mat-icon class="alert-icon">check_circle</mat-icon>
          <div class="alert-content">
            {{ successMessage() }}
          </div>
        </div>
      }

      <!-- Pending List Card -->
      <mat-card class="list-card">
        <mat-card-header>
          <mat-card-title>Pending Approvals</mat-card-title>
          <mat-card-subtitle>
            {{ pendingInvoices().length }} invoice(s) waiting for your review
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (isLoading()) {
            <div class="loading-state">Loading pending invoices...</div>
          } @else if (pendingInvoices().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">task_alt</mat-icon>
              <p>Nothing is waiting for approval. You're all caught up!</p>
            </div>
          } @else {
            <div class="cards-list">
              @for (invoice of pendingInvoices(); track invoice.id) {
                <mat-card class="invoice-item-card">
                  <div class="item-summary">
                    <div class="item-meta">
                      <span class="invoice-id">{{ invoice.id }}</span>
                      <span class="customer-name">{{ invoice.customerName }}</span>
                    </div>

                    <div class="item-amount" [class.over-limit]="isOverLimit(invoice.amount)">
                      {{ invoice.amount | currency }}
                      @if (isOverLimit(invoice.amount)) {
                        <span class="limit-warning-tag">{{ getLimitWarning(invoice.amount) }}</span>
                      }
                    </div>
                  </div>

                  <!-- Actions Section -->
                  <div class="item-actions">
                    <button
                      mat-raised-button
                      color="primary"
                      (click)="onApprove(invoice.id)"
                      [disabled]="isProcessing(invoice.id)"
                      [aria-label]="'Approve invoice ' + invoice.id"
                    >
                      Approve
                    </button>

                    <div class="reject-control">
                      <mat-form-field appearance="outline" class="reason-field" subscriptSizing="dynamic">
                        <mat-label>Rejection Reason</mat-label>
                        <input
                          matInput
                          [(ngModel)]="rejectionReasons[invoice.id]"
                          placeholder="Reason (required to reject)"
                          [aria-label]="'Rejection reason for invoice ' + invoice.id"
                        />
                      </mat-form-field>

                      <button
                        mat-stroked-button
                        color="warn"
                        (click)="onReject(invoice.id)"
                        [disabled]="isProcessing(invoice.id) || !hasReason(invoice.id)"
                        [aria-label]="'Reject invoice ' + invoice.id"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </mat-card>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .approvals-layout {
      max-width: 960px;
      margin: 24px auto;
      padding: 0 16px;
      display: grid;
      gap: 20px;
    }
    .limit-card {
      border-radius: 12px;
      padding: 16px 20px;
      background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%);
      border: 1px solid #bae6fd;
    }
    .role-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }
    .role-label {
      font-weight: 700;
      font-size: 16px;
      color: #0f172a;
    }
    .threshold-badge {
      background-color: #0284c7;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
    }
    .limit-caption {
      font-size: 13px;
      color: #475569;
    }
    .alert-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
    }
    .alert-banner.error {
      background-color: #fee2e2;
      color: #991b1b;
      border: 1px solid #f87171;
    }
    .alert-banner.success {
      background-color: #ecfdf5;
      color: #065f46;
      border: 1px solid #6ee7b7;
    }
    .alert-icon {
      flex-shrink: 0;
    }
    .cards-list {
      display: grid;
      gap: 16px;
      margin-top: 16px;
    }
    .invoice-item-card {
      padding: 16px 20px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
    }
    .item-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .invoice-id {
      font-weight: 700;
      color: #1e293b;
      font-size: 16px;
      margin-right: 12px;
    }
    .customer-name {
      color: #64748b;
      font-size: 15px;
    }
    .item-amount {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .item-amount.over-limit {
      color: #b91c1c;
    }
    .limit-warning-tag {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      background-color: #fee2e2;
      color: #991b1b;
      border-radius: 4px;
      border: 1px solid #fca5a5;
    }
    .item-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
    }
    .reject-control {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .reason-field {
      flex: 1;
    }
    .empty-state {
      padding: 48px 16px;
      text-align: center;
      color: #64748b;
    }
    .empty-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #10b981;
      margin-bottom: 8px;
    }
    .loading-state {
      padding: 32px 16px;
      text-align: center;
      color: #64748b;
    }
  `],
})
export class PendingApprovalsComponent implements OnInit {
  private readonly invoiceService = inject(InvoiceService);
  private readonly authService = inject(AuthService);

  readonly userRole = this.authService.userRole;
  readonly isLoading = signal(true);
  readonly decisionError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly processingIds = signal<Set<string>>(new Set());

  readonly rejectionReasons: Record<string, string> = {};

  readonly pendingInvoices = computed(() =>
    this.invoiceService.invoices().filter((i) => i.status === 'PendingApproval')
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.invoiceService.loadInvoices().subscribe({
      next: () => this.isLoading.set(false),
      error: (err: ApiErrorDto) => {
        this.isLoading.set(false);
        this.decisionError.set(err.error || 'Failed to load invoices.');
      },
    });
  }

  isOverLimit(amount: number): boolean {
    const role = this.userRole();
    if (role === 'Manager' && amount > 50000) return true;
    if (role === 'Director' && amount > 500000) return true;
    return false;
  }

  getLimitWarning(amount: number): string {
    const role = this.userRole();
    if (role === 'Manager' && amount > 50000) return 'Exceeds $50k Limit';
    if (role === 'Director' && amount > 500000) return 'Exceeds $500k Limit';
    return '';
  }

  onApprove(invoiceId: string): void {
    this.decisionError.set(null);
    this.successMessage.set(null);
    this.setProcessing(invoiceId, true);

    this.invoiceService.approveInvoice(invoiceId).subscribe({
      next: () => {
        this.setProcessing(invoiceId, false);
        this.successMessage.set(`Invoice ${invoiceId} approved successfully.`);
      },
      error: (err: unknown) => {
        this.setProcessing(invoiceId, false);
        this.decisionError.set(this.extractErrorMessage(err, 'Approval failed.'));
      },
    });
  }

  onReject(invoiceId: string): void {
    const reason = this.rejectionReasons[invoiceId]?.trim();
    if (!reason) {
      this.decisionError.set('A reason is required to reject an invoice.');
      return;
    }

    this.decisionError.set(null);
    this.successMessage.set(null);
    this.setProcessing(invoiceId, true);

    this.invoiceService.rejectInvoice(invoiceId, reason).subscribe({
      next: () => {
        this.setProcessing(invoiceId, false);
        this.successMessage.set(`Invoice ${invoiceId} rejected with reason: "${reason}".`);
        delete this.rejectionReasons[invoiceId];
      },
      error: (err: unknown) => {
        this.setProcessing(invoiceId, false);
        this.decisionError.set(this.extractErrorMessage(err, 'Rejection failed.'));
      },
    });
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    if (typeof err === 'object' && err !== null) {
      const e = err as Record<string, unknown>;
      if (typeof e['error'] === 'string') return e['error'];
      if (typeof e['error'] === 'object' && e['error'] !== null) {
        const inner = e['error'] as Record<string, unknown>;
        if (typeof inner['error'] === 'string') return inner['error'];
      }
      if (typeof e['message'] === 'string') return e['message'];
    }
    return fallback;
  }

  hasReason(invoiceId: string): boolean {
    return !!this.rejectionReasons[invoiceId]?.trim();
  }

  isProcessing(invoiceId: string): boolean {
    return this.processingIds().has(invoiceId);
  }

  private setProcessing(id: string, active: boolean): void {
    this.processingIds.update((current) => {
      const next = new Set(current);
      if (active) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}
