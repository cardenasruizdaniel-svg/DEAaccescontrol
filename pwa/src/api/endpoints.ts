import { api } from "./client";
import type {
  AuthResponse, User, Employee, DashboardResponse, ActiveSessionResponse,
  Shift, AccessRecord, PayrollSummaryResponse, GeofenceCheckResponse,
  BiometricVerification, StartVisitRequest, EndVisitRequest,
} from "@/types";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }, { params: { platform: "mobile" } }).then((r) => r.data),
  me: () => api.get<User>("/auth/me").then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { current_password: currentPassword, new_password: newPassword }),
};

export const mobileApi = {
  employee: () => api.get<Employee>("/mobile/me/employee").then((r) => r.data),
  dashboard: () => api.get<DashboardResponse>("/mobile/me/dashboard").then((r) => r.data),
  activeSession: () => api.get<ActiveSessionResponse>("/mobile/me/active-session").then((r) => r.data),
  shifts: (params?: { start_date?: string; end_date?: string }) =>
    api.get<Shift[]>("/mobile/me/shifts", { params }).then((r) => r.data),
  accessHistory: (params?: { start_date?: string; end_date?: string; page?: number; page_size?: number }) =>
    api.get<{ items: AccessRecord[]; total: number; page: number; page_size: number }>("/mobile/me/access-history", { params }).then((r) => r.data),
  payrollSummary: () => api.get<PayrollSummaryResponse>("/mobile/me/payroll-summary").then((r) => r.data),
  checkGeofence: (data: { latitude: number; longitude: number; client_id: string }) =>
    api.post<GeofenceCheckResponse>("/mobile/me/check-geofence", data).then((r) => r.data),
  clientInfo: (clientId: string) => api.get<{ id: string; name: string; latitude?: number; longitude?: number; geofence_radius?: number; address?: string; city?: string }>(`/mobile/clients/${clientId}`).then((r) => r.data),
};

export const shiftApi = {
  start: (data: StartVisitRequest) => api.post<{ id: string; is_late_arrival: boolean }>("/mobile/me/start-visit", data).then((r) => r.data),
  end: (data: EndVisitRequest) => api.post<{ id: string; is_early_departure: boolean; worked_hours?: number }>("/mobile/me/end-visit", data).then((r) => r.data),
};

export const biometricApi = {
  verify: (photo: string) =>
    api.post<BiometricVerification>("/facial-recognition/verify", { photo_base64: photo }).then((r) => r.data),
};

export const helpApi = {
  reportIssue: (data: { subject: string; message: string }) =>
    api.post("/mobile/support/issue", data),
};

export const auditApi = {
  log: (data: { event: string; shift_id?: string; details: string; latitude?: number; longitude?: number; success: boolean }) =>
    api.post("/mobile/me/audit-log", data).then((r) => r.data),
  batchSync: (logs: unknown[]) =>
    api.post("/mobile/me/audit-log/batch", { logs }).then((r) => r.data),
};
