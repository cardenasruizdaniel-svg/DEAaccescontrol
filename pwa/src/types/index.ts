export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  first_login?: boolean;
  force_password_change?: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_superuser: boolean;
  company_id?: string;
  role_id?: string;
  mfa_enabled?: boolean;
}

export interface Employee {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile?: string;
  address?: string;
  city?: string;
  status?: string;
  photo_url?: string;
  document_type?: string;
  document_number?: string;
  company_id: string;
  department_id?: string;
  job_position_id?: string;
  hire_date?: string;
  eps?: string;
  arl?: string;
  afp?: string;
  can_assign_georeference?: boolean;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  status: string;
  color?: string;
  client_name?: string;
  client_id?: string;
  shift_date: string;
  observations?: string;
  client_address?: string;
  client_latitude?: number;
  client_longitude?: number;
  priority?: string;
}

export interface DashboardResponse {
  employee_name: string;
  employee_id: string;
  today_shifts_count: number;
  today_shifts: Shift[];
  week_completed: number;
  week_pending: number;
  today_entries: number;
  today_exits: number;
  today_auto_closures: number;
}

export interface ActiveSessionResponse {
  active: boolean;
  shift?: Shift;
  session?: {
    entry_time?: string;
    inside_geofence?: boolean;
    face_verified?: boolean;
    entry_record_id?: string;
  };
  next_shift?: Shift;
  today_shifts?: Shift[];
}

export interface AccessRecord {
  id: string;
  record_type: "entry" | "exit";
  timestamp: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  inside_geofence?: boolean;
  face_verified?: boolean;
  worked_hours?: number;
  overtime_hours?: number;
  auto_closed?: boolean;
  is_late_arrival?: boolean;
  is_early_departure?: boolean;
  warnings?: string[];
}

export interface PayrollPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  payment_date?: string;
  status: string;
  is_closed: boolean;
}

export interface PayrollRecord {
  id: string;
  period_id: string;
  base_salary: number;
  transportation_assistance: number;
  overtime_hours: number;
  overtime_value: number;
  night_hours: number;
  night_value: number;
  bonuses: number;
  commissions: number;
  health_deduction: number;
  pension_deduction: number;
  retefuente: number;
  total_earnings: number;
  total_deductions: number;
  net_pay: number;
  total_employer_cost: number;
  worked_days: number;
  status: string;
}

export interface PayrollSummaryResponse {
  periods: PayrollPeriod[];
  latest_record: PayrollRecord | null;
}

export interface GeofenceCheckResponse {
  inside: boolean;
  distance: number;
  has_geofence: boolean;
  geofence_radius?: number;
}

export interface BiometricVerification {
  verified: boolean;
  score: number;
  message: string;
}

export interface StartVisitRequest {
  shift_id: string;
  latitude: number;
  longitude: number;
  photo_base64?: string;
  device_id?: string;
  device_model?: string;
  device_os?: string;
  battery_level?: number;
  connection_type?: string;
  is_mock_location?: boolean;
  offline_timestamp?: string;
}

export interface EndVisitRequest {
  shift_id: string;
  latitude: number;
  longitude: number;
  photo_base64?: string;
  observations?: string;
  device_id?: string;
  connection_type?: string;
  offline_timestamp?: string;
}

export interface SyncQueueItem {
  id: string;
  action: "create" | "update" | "delete";
  store: string;
  data: Record<string, unknown>;
  timestamp: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  retries: number;
  error?: string;
}

export interface AuditLog {
  id: string;
  event: string;
  shift_id?: string;
  employee_id?: string;
  details: string;
  latitude?: number;
  longitude?: number;
  photo_base64?: string;
  success: boolean;
  timestamp: string;
  synced: boolean;
}

export interface ActiveTimer {
  id: string;
  shift_id: string;
  started_at: string;
  elapsed_before: number;
  paused_at?: string;
  status: "running" | "paused" | "completed";
  last_updated: string;
}

export type GeofencePolicy = {
  enabled: boolean;
  radius_meters: number;
  auto_close_on_exit: boolean;
  check_interval_ms: number;
};
