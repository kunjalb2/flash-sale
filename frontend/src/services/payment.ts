import { apiClient } from "@/lib/api-client";
import type { CheckoutRequest, CheckoutSession, Payment } from "@/types";

export const paymentService = {
  async createCheckoutSession(request: CheckoutRequest): Promise<CheckoutSession> {
    const response = await apiClient.post<CheckoutSession>("/payments/checkout", request);
    return response;
  },

  async verifyPayment(paymentId: string) {
    const response = await apiClient.post<{ verified: boolean; payment: Payment; message: string }>(
      `/payments/verify`,
      { payment_id: paymentId }
    );
    return response;
  },

  async getPayment(paymentId: string): Promise<Payment> {
    const response = await apiClient.get<Payment>(`/payments/${paymentId}`);
    return response;
  },
};
