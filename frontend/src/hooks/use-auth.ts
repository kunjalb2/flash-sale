import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const { isAuthenticated, user, refreshUser, isLoading } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
      refreshUser();
    }
  }, [isAuthenticated, user, refreshUser]);

  return {
    isAuthenticated,
    user,
    isLoading,
    refreshUser,
  };
}
