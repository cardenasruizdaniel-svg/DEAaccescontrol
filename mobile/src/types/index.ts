export interface User {
  id: string;
  email: string;
  username?: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  mfa_enabled: boolean;
  company_id: string | null;
  role_id: string | null;
  phone?: string;
}

export interface Employee {
  id: string;
  code: string;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  second_last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  status: string;
  photo_url?: string;
  company_id: string;
  branch_id?: string;
  department_id?: string;
  job_position_id?: string;
  cost_center_id?: string;
  hire_date?: string;
  eps?: string;
  arl?: string;
  afp?: string;
}

export interface Shift {
  id: string;
  schedule_id: string;
  employee_id: string;
  client_id?: string;
  persona_id?: string;
  project_id?: string;
  shift_template_id?: string;
  name: string;
  color: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  priority: string;
  status: string;
  notes?: string;
  observations?: string;
  employee_name?: string;
  client_name?: string;
  persona_name?: string;
}

export interface AccessRecord {
  id: string;
  record_type: "entry" | "exit";
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  inside_geofence: boolean;
  face_verified: boolean;
  liveness_detected?: boolean;
  worked_hours: number | null;
  warnings: string[];
}

export interface PayrollRecord {
  id: string;
  period_id: string;
  employee_id: string;
  contract_id: string;
  company_id: string;
  base_salary: number;
  transportation_assistance: number;
  overtime_hours: number;
  overtime_value: number;
  night_hours: number;
  night_value: number;
  sunday_holiday_hours: number;
  sunday_holiday_value: number;
  bonuses: number;
  commissions: number;
  other_earnings: number;
  health_deduction: number;
  pension_deduction: number;
  solidarity_fund: number;
  retefuente: number;
  health_employer: number;
  pension_employer: number;
  arl_employer: number;
  icbf: number;
  sena: number;
  caja_compensacion_employer: number;
  cesantias: number;
  prima_servicios: number;
  total_earnings: number;
  total_deductions: number;
  total_employer_cost: number;
  net_pay: number;
  worked_days: number;
  status: string;
  notes?: string;
}

export interface PayrollPeriod {
  id: string;
  name: string;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  payment_date: string;
  status: string;
  is_closed: boolean;
  company_id: string;
}

export interface Geofence {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  center_latitude: number;
  center_longitude: number;
  radius: number;
  shape?: string;
  color?: string;
  client_id?: string;
  alert_on_exit: boolean;
  alert_on_entry: boolean;
  is_active: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export interface OfflineRecord {
  id: string;
  type: "entry" | "exit" | "location" | "face_register";
  data: Record<string, unknown>;
  timestamp: string;
  synced: boolean;
  sync_attempts: number;
  last_error?: string;
}
