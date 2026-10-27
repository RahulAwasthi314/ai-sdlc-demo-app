/**
 * Generic standard API Error DTO structure shared between backend and frontend.
 */
export interface ApiErrorDto {
  error: string;
  code?: string;
  status?: number;
  details?: string[];
}
