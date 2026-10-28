import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { roleGuard, authGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { signal } from '@angular/core';
import { UserRole } from '../models/user-session.model';

describe('Route Guards', () => {
  let mockAuthService: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    userRole: ReturnType<typeof signal<UserRole | null>>;
  };
  let router: Router;

  beforeEach(() => {
    mockAuthService = {
      isAuthenticated: signal(false),
      userRole: signal(null),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('should allow access when authenticated', () => {
      mockAuthService.isAuthenticated.set(true);
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('should redirect to root when not authenticated', () => {
      mockAuthService.isAuthenticated.set(false);
      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any)) as UrlTree;
      expect(result.toString()).toBe('/');
    });
  });

  describe('roleGuard', () => {
    it('should redirect to root when user is not authenticated', () => {
      mockAuthService.isAuthenticated.set(false);
      const guard = roleGuard(['Employee']);
      const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any)) as UrlTree;
      expect(result.toString()).toBe('/');
    });

    it('should allow access when user role matches allowed roles', () => {
      mockAuthService.isAuthenticated.set(true);
      mockAuthService.userRole.set('Director');
      const guard = roleGuard(['Manager', 'Director']);
      const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any));
      expect(result).toBe(true);
    });

    it('should redirect unauthorized Employee to /invoices when accessing /approvals', () => {
      mockAuthService.isAuthenticated.set(true);
      mockAuthService.userRole.set('Employee');
      const guard = roleGuard(['Manager', 'Director']);
      const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any)) as UrlTree;
      expect(result.toString()).toBe('/invoices');
    });

    it('should redirect unauthorized Manager to /approvals when accessing /invoices', () => {
      mockAuthService.isAuthenticated.set(true);
      mockAuthService.userRole.set('Manager');
      const guard = roleGuard(['Employee']);
      const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any)) as UrlTree;
      expect(result.toString()).toBe('/approvals');
    });

    it('should redirect unauthorized Director to /approvals when accessing /invoices', () => {
      mockAuthService.isAuthenticated.set(true);
      mockAuthService.userRole.set('Director');
      const guard = roleGuard(['Employee']);
      const result = TestBed.runInInjectionContext(() => guard({} as any, {} as any)) as UrlTree;
      expect(result.toString()).toBe('/approvals');
    });
  });
});

