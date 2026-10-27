import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { apiErrorInterceptor } from './api-error.interceptor';
import { ApiErrorDto } from '../models/api-error.dto';

describe('apiErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should normalize standard backend ApiErrorDto responses', () => {
    const backendError: ApiErrorDto = {
      error: 'Invoice not found.',
      code: 'NOT_FOUND',
      status: 404,
      details: ['ID INV-999 does not exist'],
    };

    let caughtError: ApiErrorDto | undefined;

    httpClient.get('/api/invoices/INV-999').subscribe({
      next: () => expect.fail('Expected request to fail with 404'),
      error: (err: ApiErrorDto) => {
        caughtError = err;
      },
    });

    const req = httpMock.expectOne('/api/invoices/INV-999');
    req.flush(backendError, { status: 404, statusText: 'Not Found' });

    expect(caughtError).toBeDefined();
    expect(caughtError?.error).toBe('Invoice not found.');
    expect(caughtError?.code).toBe('NOT_FOUND');
    expect(caughtError?.status).toBe(404);
    expect(caughtError?.details).toEqual(['ID INV-999 does not exist']);
  });

  it('should normalize network dropouts (status 0) gracefully', () => {
    let caughtError: ApiErrorDto | undefined;

    httpClient.get('/api/invoices').subscribe({
      next: () => expect.fail('Expected request to fail with status 0'),
      error: (err: ApiErrorDto) => {
        caughtError = err;
      },
    });

    const req = httpMock.expectOne('/api/invoices');
    req.error(new ProgressEvent('error'), { status: 0 });

    expect(caughtError).toBeDefined();
    expect(caughtError?.code).toBe('NETWORK_UNAVAILABLE');
    expect(caughtError?.status).toBe(0);
    expect(caughtError?.error).toContain('Unable to reach the backend service');
  });

  it('should normalize unexpected non-DTO server errors (status 500) gracefully', () => {
    let caughtError: ApiErrorDto | undefined;

    httpClient.post('/api/invoices', {}).subscribe({
      next: () => expect.fail('Expected request to fail with 500'),
      error: (err: ApiErrorDto) => {
        caughtError = err;
      },
    });

    const req = httpMock.expectOne('/api/invoices');
    req.flush('Unhandled server fault string', { status: 500, statusText: 'Internal Server Error' });

    expect(caughtError).toBeDefined();
    expect(caughtError?.code).toBe('HTTP_ERROR');
    expect(caughtError?.status).toBe(500);
    expect(caughtError?.error).toBe('Internal Server Error');
  });
});
