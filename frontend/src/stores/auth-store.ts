import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, AuthTokens, LoginCredentials, RegisterCredentials } from "@/types";
import { apiClient } from "@/lib/api-client";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true, // Start as loading
      error: null,

      initialize: () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
        if (token) {
          set({ isAuthenticated: true, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      },

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<AuthTokens & { user: User }>(
            "/auth/login",
            credentials
          );
          const { access_token, refresh_token, user } = response;

          if (typeof window !== "undefined") {
            localStorage.setItem("access_token", access_token);
            localStorage.setItem("refresh_token", refresh_token);
          }

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
          const err = error as { response?: { data?: { detail?: string } } };
          const message = err.response?.data?.detail || "Invalid email or password";
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      register: async (credentials: RegisterCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<AuthTokens & { user: User }>(
            "/auth/register",
            credentials
          );
          const { access_token, refresh_token, user } = response;

          if (typeof window !== "undefined") {
            localStorage.setItem("access_token", access_token);
            localStorage.setItem("refresh_token", refresh_token);
          }

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
          const err = error as { response?: { data?: { detail?: string } } };
          const message = err.response?.data?.detail || "Registration failed. Please try again.";
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await apiClient.post("/auth/logout");
        } catch {
        } finally {
          if (typeof window !== "undefined") {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
          }
          apiClient.logout();
          set({ user: null, isAuthenticated: false, error: null, isLoading: false });
        }
      },

      refreshUser: async () => {
        const { isAuthenticated } = get();
        if (!isAuthenticated) return;

        try {
          const user = await apiClient.get<User>("/auth/me");
          set({ user });
        } catch {
          get().logout();
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "seatflow-auth",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
