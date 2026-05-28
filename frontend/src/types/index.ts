export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  venue: string;
  address: string;
  event_date: string;
  sale_start_date: string;
  sale_end_date: string;
  total_tickets: number;
  available_tickets: number;
  price_per_ticket: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  total_tickets: number;
  available_tickets: number;
  max_per_user: number;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  event_id: string;
  seat_number: string;
  section: string | null;
  row: string | null;
  seat_type: "general" | "premium" | "vip";
  price: number;
  status: "available" | "reserved" | "sold";
  reserved_at: string | null;
  reserved_by: string | null;
  sold_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  event_id: string;
  ticket_type_id: string | null;
  quantity: number;
  total_price: number;
  expires_at: string;
  status: "pending" | "confirmed" | "cancelled" | "expired";
  payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
  event?: Event;
  ticket_type?: TicketType;
}

export interface Booking {
  id: string;
  reservation_id: string;
  user_id: string;
  event_id: string;
  quantity: number;
  total_price: number;
  payment_status: "pending" | "completed" | "failed" | "refunded";
  payment_intent_id: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  event?: Event;
  reservation?: Reservation;
}

export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "cancelled" | "refunded" | "refund_pending";
  payment_method: "stripe";
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_receipt_url: string | null;
  stripe_invoice_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckoutSession {
  checkout_session_id: string;
  checkout_url: string;
  booking_id: string;
}

export interface CheckoutRequest {
  booking_id: string;
  success_url?: string;
  cancel_url?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  detail: string | { [key: string]: string[] };
  status?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// --- Admin Types ---

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  booking_count: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface AdminUserDetail extends AdminUser {
  recent_bookings: Array<{
    id: string;
    event_id: string;
    ticket_count: number;
    total_amount: number;
    status: string;
    created_at: string;
  }> | null;
  recent_payments: Array<{
    id: string;
    amount: number;
    status: string;
    created_at: string;
  }> | null;
}

export interface AdminUserCreateResponse extends AdminUser {
  generated_password: string | null;
}

export interface AdminUserCreate {
  email: string;
  full_name: string;
  password?: string;
  is_superuser?: boolean;
}

export interface AdminBooking {
  id: string;
  user_id: string;
  event_id: string;
  ticket_count: number;
  total_amount: number;
  status: string;
  reserved_at: string;
  expires_at: string | null;
  user_email: string | null;
  event_title: string | null;
  payment_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminBookingDetail extends AdminBooking {
  user_info: { email: string; full_name: string } | null;
  event_info: { title: string; venue: string; event_date: string } | null;
  payment_info: { id: string; amount: number; status: string; method: string } | null;
}

export interface AdminPayment {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  stripe_receipt_url: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  user_email: string | null;
  event_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_users: number;
  total_events: number;
  total_bookings: number;
  total_revenue: number;
  active_events: number;
  confirmed_bookings: number;
  pending_bookings: number;
  cancelled_bookings: number;
  recent_bookings_count: number;
  recent_users_count: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  booking_count: number;
}

export interface RevenueResponse {
  period: string;
  data: RevenueDataPoint[];
  total: number;
}

export interface EventPerformance {
  event_id: string;
  title: string;
  venue: string;
  event_date: string;
  total_tickets: number;
  sold_tickets: number;
  available_tickets: number;
  revenue: number;
  booking_count: number;
}

export interface RecentActivityItem {
  id: string;
  type: string;
  description: string;
  amount: number | null;
  created_at: string;
}

export interface TicketBatchItem {
  seat_number: string;
  section?: string | null;
  row?: string | null;
  price?: number | null;
  seat_type?: string;
  notes?: string | null;
}

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

// --- Chat Types ---

export interface ChatSession {
  id: string;
  event_id: string | null;
  status: "active" | "closed" | "expired";
  message_count: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface ChatMessageRequest {
  message: string;
  session_id: string;
}

export interface ChatSessionCreate {
  event_id?: string | null;
}

export interface ChatHistoryResponse {
  session_id: string;
  messages: ChatMessage[];
}

export interface SSEChatChunk {
  content: string | null;
  done: boolean;
  action?: {
    type: "reserve" | "browse_events";
    event_id?: string;
  } | null;
  error?: string;
  usage?: {
    total_tokens: number;
  };
}

