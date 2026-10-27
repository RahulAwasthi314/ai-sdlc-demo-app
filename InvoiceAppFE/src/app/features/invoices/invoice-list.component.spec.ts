import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { InvoiceListComponent } from './invoice-list.component';
import { InvoiceService } from '../../core/services/invoice.service';
import { Invoice } from '../../core/models/invoice.model';

describe('InvoiceListComponent', () => {
  let component: InvoiceListComponent;
  let fixture: ComponentFixture<InvoiceListComponent>;
  let httpMock: HttpTestingController;

  const mockInvoices: Invoice[] = [
    {
      id: 'INV-101',
      customerName: 'Alpha LLC',
      amount: 15000,
      status: 'Draft',
      createdAt: '2026-10-28T00:00:00Z',
    },
    {
      id: 'INV-102',
      customerName: 'Beta Inc',
      amount: 25000,
      status: 'PendingApproval',
      createdAt: '2026-10-28T01:00:00Z',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        InvoiceService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InvoiceListComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should initialize and load invoices', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/invoices');
    expect(req.request.method).toBe('GET');
    req.flush(mockInvoices);

    expect(component.isLoading()).toBe(false);
    expect(component.invoices().length).toBe(2);
  });

  it('should create new invoice when form is submitted with valid data', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/invoices').flush(mockInvoices);

    component.createForm.setValue({
      customerName: 'Gamma Corp',
      amount: 32000,
    });

    component.onCreateInvoice();

    const createReq = httpMock.expectOne('/api/invoices');
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual({ customerName: 'Gamma Corp', amount: 32000 });

    const createdInvoice: Invoice = {
      id: 'INV-103',
      customerName: 'Gamma Corp',
      amount: 32000,
      status: 'Draft',
      createdAt: '2026-10-28T02:00:00Z',
    };
    createReq.flush(createdInvoice);

    expect(component.isSubmitting()).toBe(false);
    expect(component.successMessage()).toContain('INV-103');
  });

  it('should submit draft invoice for approval', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/invoices').flush(mockInvoices);

    component.onSubmitForApproval('INV-101');

    const submitReq = httpMock.expectOne('/api/invoices/INV-101/submit');
    expect(submitReq.request.method).toBe('POST');

    const updatedInvoice: Invoice = {
      ...mockInvoices[0],
      status: 'PendingApproval',
    };
    submitReq.flush(updatedInvoice);

    expect(component.successMessage()).toContain('submitted for approval');
  });
});
