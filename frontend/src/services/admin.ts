import { apiClient } from "@/lib/api-client";
import type {
  AdminUser,
  AdminUserCreate,
  AdminUserCreateResponse,
  AdminUserDetail,
  AdminBooking,
  AdminBookingDetail,
  AdminPayment,
  DashboardStats,
  RevenueResponse,
  EventPerformance,
  RecentActivityItem,
  PaginatedResponse,
  TicketBatchItem,
} from "@/types";

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") {
      searchParams.set(k, String(v));
    }
  });
  return searchParams.toString();
}

export const adminService = {
  // Dashboard
  getStats: () => apiClient.get<DashboardStats>("/admin/dashboard/stats"),
  getRevenue: (params: { period?: string; start_date?: string; end_date?: string }) =>
    apiClient.get<RevenueResponse>(`/admin/dashboard/revenue?${buildQuery(params)}`),
  getEventsPerformance: (limit: number = 10) =>
    apiClient.get<{ items: EventPerformance[] }>(`/admin/dashboard/events-performance?limit=${limit}`),
  getRecentActivity: (limit: number = 20) =>
    apiClient.get<{ items: RecentActivityItem[]; total: number }>(`/admin/dashboard/recent-activity?limit=${limit}`),

  // Users
  createUser: (data: AdminUserCreate) =>
    apiClient.post<AdminUserCreateResponse>("/admin/users", data),
  listUsers: (params: { page?: number; size?: number; search?: string; is_active?: boolean; is_superuser?: boolean }) =>
    apiClient.get<PaginatedResponse<AdminUser>>(`/admin/users?${buildQuery(params as Record<string, string | number | boolean | undefined>)}`),
  getUser: (id: string) => apiClient.get<AdminUserDetail>(`/admin/users/${id}`),
  updateUser: (id: string, data: { full_name?: string; is_active?: boolean; is_superuser?: boolean }) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}`, data),
  deleteUser: (id: string) => apiClient.delete(`/admin/users/${id}`),

  // Bookings
  listBookings: (params: { page?: number; size?: number; status?: string; event_id?: string; user_id?: string; date_from?: string; date_to?: string }) =>
    apiClient.get<PaginatedResponse<AdminBooking>>(`/admin/bookings?${buildQuery(params as Record<string, string | number | boolean | undefined>)}`),
  getBooking: (id: string) => apiClient.get<AdminBookingDetail>(`/admin/bookings/${id}`),
  cancelBooking: (id: string) => apiClient.post(`/admin/bookings/${id}/cancel`),
  refundBooking: (id: string) => apiClient.post(`/admin/bookings/${id}/refund`),

  // Payments
  listPayments: (params: { page?: number; size?: number; status?: string; payment_method?: string; date_from?: string; date_to?: string }) =>
    apiClient.get<PaginatedResponse<AdminPayment>>(`/admin/payments?${buildQuery(params as Record<string, string | number | boolean | undefined>)}`),
  getPayment: (id: string) => apiClient.get<AdminPayment>(`/admin/payments/${id}`),

  // Tickets
  batchCreateTickets: (eventId: string, data: { tickets: TicketBatchItem[]; default_price?: number; default_seat_type?: string }) =>
    apiClient.post(`/admin/events/${eventId}/tickets/batch`, data),
  updateTicket: (id: string, data: { price?: number; section?: string; notes?: string }) =>
    apiClient.patch(`/admin/tickets/${id}`, data),
  deleteTicket: (id: string) => apiClient.delete(`/admin/tickets/${id}`),
};
