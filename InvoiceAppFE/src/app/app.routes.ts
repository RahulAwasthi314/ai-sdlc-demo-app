import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'invoices',
    loadComponent: () =>
      import('./features/invoices/invoice-list.component').then((m) => m.InvoiceListComponent),
    canActivate: [roleGuard(['Employee'])],
  },
  {
    path: 'approvals',
    loadComponent: () =>
      import('./features/approvals/pending-approvals.component').then((m) => m.PendingApprovalsComponent),
    canActivate: [roleGuard(['Manager', 'Director', 'Approver'])],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
