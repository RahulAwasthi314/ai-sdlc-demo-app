/**
 * User roles recognized by the application.
 */
export type UserRole = 'Employee' | 'Manager' | 'Approver' | 'Admin';

/**
 * User session state persisted for authenticated communication.
 */
export interface UserSession {
  token: string;
  username: string;
  role: UserRole;
}

/**
 * Authentication response from /api/auth/login.
 */
export interface LoginResponse {
  token: string;
  username: string;
  role: string;
}
