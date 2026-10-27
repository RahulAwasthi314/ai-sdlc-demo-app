import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiErrorDto } from '../models/api-error.dto';

/**
 * Global HTTP interceptor converting all backend errors into standard ApiErrorDto instances
 * and injecting session bearer token into outgoing requests.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  let authReq = req;
  const rawSession = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('session') : null;
  if (rawSession) {
    try {
      const session = JSON.parse(rawSession);
      if (session?.token) {
        authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${session.token}`,
          },
        });
      }
    } catch {
      // ignore session parse failure
    }
  }

  return next(authReq).pipe(
    catchError((errorResponse: HttpErrorResponse) => {
      let normalizedError: ApiErrorDto;

      if (
        errorResponse.error &&
        typeof errorResponse.error === 'object' &&
        'error' in errorResponse.error
      ) {
        normalizedError = {
          error: String(errorResponse.error.error),
          code: errorResponse.error.code,
          status: errorResponse.status,
          details: errorResponse.error.details,
        };
      } else if (errorResponse.status === 0) {
        normalizedError = {
          error: 'Network error: Unable to reach the backend service.',
          code: 'NETWORK_UNAVAILABLE',
          status: 0,
        };
      } else {
        normalizedError = {
          error: errorResponse.statusText || 'An unexpected error occurred.',
          code: 'HTTP_ERROR',
          status: errorResponse.status,
        };
      }

      return throwError(() => normalizedError);
    })
  );
};
