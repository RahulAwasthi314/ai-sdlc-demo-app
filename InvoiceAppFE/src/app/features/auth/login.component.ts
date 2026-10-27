import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { ApiErrorDto } from '../../core/models/api-error.dto';

/**
 * Authentication login component providing role credentials input.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Invoice Approvals Sign In</mat-card-title>
          <mat-card-subtitle>Sign in to manage and review invoices</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Username</mat-label>
              <input
                matInput
                formControlName="username"
                autocomplete="username"
                aria-label="Username"
                required
              />
              @if (loginForm.get('username')?.hasError('required')) {
                <mat-error>Username is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input
                matInput
                type="password"
                formControlName="password"
                autocomplete="current-password"
                aria-label="Password"
                required
              />
              @if (loginForm.get('password')?.hasError('required')) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>

            @if (errorMessage()) {
              <div class="error-banner" role="alert" aria-live="assertive">
                {{ errorMessage() }}
              </div>
            }

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="full-width submit-btn"
              [disabled]="loginForm.invalid || isLoading()"
            >
              Sign In
            </button>
          </form>

          <div class="demo-accounts">
            <p><strong>Demo Credentials:</strong></p>
            <ul>
              <li><code>demo.manager</code> / <code>ChangeMe123!</code> (Manager - limits apply)</li>
              <li><code>demo.approver</code> / <code>ChangeMe123!</code> (Approver)</li>
              <li><code>demo.admin</code> / <code>ChangeMe123!</code> (Admin)</li>
            </ul>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 120px);
      padding: 16px;
    }
    .login-card {
      max-width: 440px;
      width: 100%;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }
    .full-width {
      width: 100%;
      margin-bottom: 12px;
    }
    .submit-btn {
      margin-top: 8px;
      height: 44px;
      font-size: 15px;
    }
    .error-banner {
      background-color: #fee2e2;
      color: #991b1b;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
      font-weight: 500;
    }
    .demo-accounts {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 13px;
      color: #64748b;
    }
    .demo-accounts ul {
      padding-left: 20px;
      margin: 4px 0 0;
    }
  `],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { username, password } = this.loginForm.getRawValue();
    this.authService.login(username!, password!).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (err: ApiErrorDto) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error || 'Authentication failed.');
      },
    });
  }
}
