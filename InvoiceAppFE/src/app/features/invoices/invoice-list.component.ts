import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { InvoiceService } from '../../core/services/invoice.service';
import { Invoice } from '../../core/models/invoice.model';
import { ApiErrorDto } from '../../core/models/api-error.dto';

/**
 * Component for employees to create invoices and manage their submission lifecycle.
 */
@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
  ],
  template: `
    <div class="invoices-layout">
      <!-- Invoice Creation Form Card -->
      <mat-card class="form-card">
        <mat-card-header>
          <mat-card-title>Apply for New Invoice</mat-card-title>
          <mat-card-subtitle>Create a draft invoice and submit it for management approval</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="createForm" (ngSubmit)="onCreateInvoice()" class="create-form">
            <mat-form-field appearance="outline" class="field-item">
              <mat-label>Customer Name</mat-label>
              <input
                matInput
                formControlName="customerName"
                placeholder="e.g. Acme Corporation"
                aria-label="Customer name"
                required
              />
              @if (createForm.get('customerName')?.hasError('required')) {
                <mat-error>Customer name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="field-item">
              <mat-label>Amount ($)</mat-label>
              <input
                matInput
                type="number"
                step="0.01"
                min="0.01"
                formControlName="amount"
                placeholder="0.00"
                aria-label="Amount"
                required
              />
              @if (createForm.get('amount')?.hasError('required')) {
                <mat-error>Amount is required</mat-error>
              }
              @if (createForm.get('amount')?.hasError('min')) {
                <mat-error>Amount must be at least $0.01</mat-error>
              }
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="create-btn"
              [disabled]="createForm.invalid || isSubmitting()"
            >
              Create Invoice
            </button>
          </form>

          @if (formError()) {
            <div class="alert-box error" role="alert" aria-live="assertive">
              {{ formError() }}
            </div>
          }
          @if (successMessage()) {
            <div class="alert-box success" role="status" aria-live="polite">
              {{ successMessage() }}
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Invoices List Table Card -->
      <mat-card class="table-card">
        <mat-card-header>
          <mat-card-title>All Invoices</mat-card-title>
          <mat-card-subtitle>Track billing status and submit drafts for approval</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (isLoading()) {
            <div class="loading-state">Loading invoices...</div>
          } @else if (invoices().length === 0) {
            <div class="empty-state">No invoices submitted yet. Create one above to get started.</div>
          } @else {
            <table mat-table [dataSource]="invoices()" class="mat-elevation-z1 full-width-table" aria-label="Invoices Table">
              <!-- ID Column -->
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef scope="col">ID</th>
                <td mat-cell *matCellDef="let invoice" class="id-cell">{{ invoice.id }}</td>
              </ng-container>

              <!-- Customer Column -->
              <ng-container matColumnDef="customerName">
                <th mat-header-cell *matHeaderCellDef scope="col">Customer</th>
                <td mat-cell *matCellDef="let invoice">{{ invoice.customerName }}</td>
              </ng-container>

              <!-- Amount Column -->
              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef scope="col">Amount</th>
                <td mat-cell *matCellDef="let invoice" class="amount-cell">{{ invoice.amount | currency }}</td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef scope="col">Status</th>
                <td mat-cell *matCellDef="let invoice">
                  <span [class]="'status-badge status-' + invoice.status">
                    {{ formatStatus(invoice.status) }}
                  </span>
                </td>
              </ng-container>

              <!-- Action Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef scope="col">Actions</th>
                <td mat-cell *matCellDef="let invoice">
                  @if (invoice.status === 'Draft') {
                    <button
                      mat-stroked-button
                      color="primary"
                      (click)="onSubmitForApproval(invoice.id)"
                      [aria-label]="'Submit invoice ' + invoice.id + ' for approval'"
                    >
                      Submit for Approval
                    </button>
                  } @else if (invoice.status === 'Approved') {
                    <span class="decided-info">Approved by {{ invoice.decidedBy }}</span>
                  } @else if (invoice.status === 'Rejected') {
                    <span class="decided-info rejected">Rejected: {{ invoice.decisionNote }}</span>
                  } @else {
                    <span class="pending-tag">Waiting for decision</span>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .invoices-layout {
      max-width: 1040px;
      margin: 24px auto;
      padding: 0 16px;
      display: grid;
      gap: 24px;
    }
    .form-card, .table-card {
      border-radius: 12px;
      padding: 16px;
    }
    .create-form {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      margin-top: 16px;
    }
    .field-item {
      flex: 1 1 240px;
      margin-bottom: 0;
    }
    .create-btn {
      height: 56px;
      padding: 0 24px;
      font-weight: 600;
    }
    .alert-box {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
    }
    .alert-box.error {
      background-color: #fee2e2;
      color: #991b1b;
      border-left: 4px solid #ef4444;
    }
    .alert-box.success {
      background-color: #ecfdf5;
      color: #065f46;
      border-left: 4px solid #10b981;
    }
    .full-width-table {
      width: 100%;
      margin-top: 16px;
    }
    .id-cell {
      font-weight: 600;
      color: #334155;
    }
    .amount-cell {
      font-weight: 600;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-Draft {
      background-color: #e2e8f0;
      color: #475569;
    }
    .status-PendingApproval {
      background-color: #fef3c7;
      color: #92400e;
    }
    .status-Approved {
      background-color: #d1fae5;
      color: #065f46;
    }
    .status-Rejected {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .decided-info {
      font-size: 13px;
      color: #64748b;
    }
    .decided-info.rejected {
      color: #b91c1c;
    }
    .pending-tag {
      font-size: 13px;
      color: #d97706;
      font-style: italic;
    }
    .loading-state, .empty-state {
      padding: 32px 16px;
      text-align: center;
      color: #64748b;
    }
  `],
})
export class InvoiceListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly invoiceService = inject(InvoiceService);

  readonly invoices = this.invoiceService.invoices;
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly displayedColumns: string[] = ['id', 'customerName', 'amount', 'status', 'actions'];

  readonly createForm = this.fb.group({
    customerName: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.invoiceService.loadInvoices().subscribe({
      next: () => this.isLoading.set(false),
      error: (err: ApiErrorDto) => {
        this.isLoading.set(false);
        this.formError.set(err.error || 'Failed to load invoices.');
      },
    });
  }

  onCreateInvoice(): void {
    if (this.createForm.invalid) return;

    this.isSubmitting.set(true);
    this.formError.set(null);
    this.successMessage.set(null);

    const { customerName, amount } = this.createForm.getRawValue();
    this.invoiceService.createInvoice({ customerName: customerName!, amount: Number(amount) }).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.successMessage.set(`Invoice ${created.id} created successfully.`);
        this.createForm.reset();
      },
      error: (err: ApiErrorDto) => {
        this.isSubmitting.set(false);
        this.formError.set(err.error || 'Failed to create invoice.');
      },
    });
  }

  onSubmitForApproval(invoiceId: string): void {
    this.formError.set(null);
    this.successMessage.set(null);

    this.invoiceService.submitInvoice(invoiceId).subscribe({
      next: () => {
        this.successMessage.set(`Invoice ${invoiceId} submitted for approval.`);
      },
      error: (err: ApiErrorDto) => {
        this.formError.set(err.error || 'Failed to submit invoice.');
      },
    });
  }

  formatStatus(status: string): string {
    return status.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
}
