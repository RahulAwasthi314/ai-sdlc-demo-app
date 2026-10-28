import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user-session.model';

/**
 * Guard ensuring only authenticated users can access protected routes.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/');
};

/**
 * Functional guard restricting route access to specific user roles.
 */
export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.parseUrl('/');
    }

    const currentRole = authService.userRole();
    if (currentRole && allowedRoles.includes(currentRole)) {
      return true;
    }

    // Redirect to the appropriate home for their role
    if (currentRole === 'Manager' || currentRole === 'Approver' || currentRole === 'Director') {
      return router.parseUrl('/approvals');
    }

    return router.parseUrl('/invoices');
  };
};
