"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requireAuth = true,
  requireAdmin = false,
  redirectTo = "/auth/login",
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading, initialize } = useAuthStore();
  const initializedRef = useRef(false);

  // Initialize only once
  useEffect(() => {
    if (!initializedRef.current) {
      initialize();
      initializedRef.current = true;
    }
  }, [initialize]);

  // Handle redirects only after initialization is complete
  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      router.push(`${redirectTo}?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requireAdmin && (!user?.is_admin)) {
      router.push("/unauthorized");
      return;
    }

    if (!requireAuth && isAuthenticated && pathname === "/auth/login") {
      router.push("/events");
      return;
    }

    if (!requireAuth && isAuthenticated && pathname === "/auth/register") {
      router.push("/events");
      return;
    }
  }, [isAuthenticated, user, isLoading, requireAuth, requireAdmin, redirectTo, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (requireAdmin && !user?.is_admin) {
    return null;
  }

  if (!requireAuth && isAuthenticated && (pathname === "/auth/login" || pathname === "/auth/register")) {
    return null;
  }

  return <>{children}</>;
}
