import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiErrorDto } from '../models/api-error.dto';

/**
 * Global HTTP interceptor converting all backend errors into standard ApiErrorDto instances.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
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
          details: errorResponse.error.details
        };
      } else if (errorResponse.status === 0) {
        normalizedError = {
          error: 'Network error: Unable to reach the backend service.',
          code: 'NETWORK_UNAVAILABLE',
          status: 0
        };
      } else {
        normalizedError = {
          error: errorResponse.statusText || 'An unexpected error occurred.',
          code: 'HTTP_ERROR',
          status: errorResponse.status
        };
      }

      return throwError(() => normalizedError);
    })
  );
};
