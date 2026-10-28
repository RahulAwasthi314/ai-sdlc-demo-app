import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PendingApprovalsComponent } from './pending-approvals.component';
import { InvoiceService } from '../../core/services/invoice.service';
import { AuthService } from '../../core/services/auth.service';
import { Invoice } from '../../core/models/invoice.model';
import { ApiErrorDto } from '../../core/models/api-error.dto';
import { apiErrorInterceptor } from '../../core/interceptors/api-error.interceptor';

describe('PendingApprovalsComponent', () => {
  let component: PendingApprovalsComponent;
  let fixture: ComponentFixture<PendingApprovalsComponent>;
  let httpMock: HttpTestingController;

  const mockInvoices: Invoice[] = [
    {
      id: 'INV-201',
      customerName: 'Standard Corp',
      amount: 40000,
      status: 'PendingApproval',
      createdAt: '2026-10-28T01:00:00Z',
    },
    {
      id: 'INV-202',
      customerName: 'High Value Corp',
      amount: 60000,
      status: 'PendingApproval',
      createdAt: '2026-10-28T01:10:00Z',
    },
    {
      id: 'INV-203',
      customerName: 'Approved Corp',
      amount: 10000,
      status: 'Approved',
      createdAt: '2026-10-28T00:30:00Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingApprovalsComponent],
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        InvoiceService,
        AuthService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PendingApprovalsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load only pending invoices', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/invoices');
    req.flush(mockInvoices);

    expect(component.isLoading()).toBe(false);
    expect(component.pendingInvoices().length).toBe(2);
    expect(component.pendingInvoices().every((i) => i.status === 'PendingApproval')).toBe(true);
  });

  it('should approve pending invoice within limit', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/invoices').flush(mockInvoices);

    component.onApprove('INV-201');

    const approveReq = httpMock.expectOne('/api/approvals/INV-201/approve');
    expect(approveReq.request.method).toBe('POST');

    const approvedInvoice: Invoice = {
      ...mockInvoices[0],
      status: 'Approved',
      decidedBy: 'demo.manager',
    };
    approveReq.flush(approvedInvoice);

    expect(component.successMessage()).toContain('approved successfully');
    expect(component.pendingInvoices().length).toBe(1);
  });

  it('should display error alert when approval exceeds limit', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/invoices').flush(mockInvoices);

    component.onApprove('INV-202');

    const approveReq = httpMock.expectOne('/api/approvals/INV-202/approve');
    const limitError: ApiErrorDto = {
      error: 'Manager approval limit exceeded: invoice amount 60000.00 exceeds authorized threshold of 50000.00.',
      code: 'LIMIT_EXCEEDED',
      status: 400,
    };
    approveReq.flush(limitError, { status: 400, statusText: 'Bad Request' });

    expect(component.decisionError()).toContain('Manager approval limit exceeded');
    expect(component.decisionError()).toContain('50000.00');
  });

  it('should reject pending invoice when reason is provided', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/invoices').flush(mockInvoices);

    component.rejectionReasons['INV-201'] = 'Duplicate billing line item';
    component.onReject('INV-201');

    const rejectReq = httpMock.expectOne('/api/approvals/INV-201/reject');
    expect(rejectReq.request.body).toEqual({ reason: 'Duplicate billing line item' });

    const rejectedInvoice: Invoice = {
      ...mockInvoices[0],
      status: 'Rejected',
      decisionNote: 'Duplicate billing line item',
    };
    rejectReq.flush(rejectedInvoice);

    expect(component.successMessage()).toContain('rejected with reason');
  });

  it('should require a reason before rejection', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/invoices').flush(mockInvoices);

    component.onReject('INV-201');
    httpMock.expectNone('/api/approvals/INV-201/reject');

    expect(component.decisionError()).toContain('reason is required');
  });

  it('should identify over-limit for Director when amount > 500,000', () => {
    const authService = TestBed.inject(AuthService);
    (authService as any).sessionState.set({
      token: 'test-token',
      username: 'demo.director',
      role: 'Director',
    });

    expect(component.isOverLimit(250000)).toBe(false);
    expect(component.isOverLimit(500000)).toBe(false);
    expect(component.isOverLimit(500000.01)).toBe(true);
    expect(component.getLimitWarning(500000.01)).toBe('Exceeds $500k Limit');
  });

  it('should display error alert when Director approval exceeds 500,000', () => {
    const authService = TestBed.inject(AuthService);
    (authService as any).sessionState.set({
      token: 'test-token',
      username: 'demo.director',
      role: 'Director',
    });

    fixture.detectChanges();
    httpMock.expectOne('/api/invoices').flush(mockInvoices);

    component.onApprove('INV-202');

    const approveReq = httpMock.expectOne('/api/approvals/INV-202/approve');
    const limitError: ApiErrorDto = {
      error: 'Director approval limit exceeded: invoice amount 550000.00 exceeds authorized threshold of 500000.00.',
      code: 'LIMIT_EXCEEDED',
      status: 400,
    };
    approveReq.flush(limitError, { status: 400, statusText: 'Bad Request' });

    expect(component.decisionError()).toContain('Director approval limit exceeded');
    expect(component.decisionError()).toContain('500000.00');
  });

  it('should render error alert and preserve pending invoice when approval returns SAME_APPROVER_NOT_ALLOWED', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/invoices').flush(mockInvoices);

    expect(component.pendingInvoices().length).toBe(2);

    component.onApprove('INV-201');

    const approveReq = httpMock.expectOne('/api/approvals/INV-201/approve');
    const sameApproverError: ApiErrorDto = {
      error: 'The same user may never count as both approvers on one invoice.',
      code: 'SAME_APPROVER_NOT_ALLOWED',
      status: 400,
    };
    approveReq.flush(sameApproverError, { status: 400, statusText: 'Bad Request' });

    expect(component.decisionError()).toBe('The same user may never count as both approvers on one invoice.');
    // Ensure invoice list item is preserved
    expect(component.pendingInvoices().length).toBe(2);
    expect(component.pendingInvoices().some((i) => i.id === 'INV-201')).toBe(true);
  });
});
