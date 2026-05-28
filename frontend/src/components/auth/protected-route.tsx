"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  allowedRoles?: Array<"user" | "admin">;
}

export function ProtectedRoute({
  children,
  redirectTo = "/auth/login",
  allowedRoles = ["user", "admin"],
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push(`${redirectTo}?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (user && allowedRoles.length > 0) {
      const hasAllowedRole = allowedRoles.includes(user.is_admin ? "admin" : "user");
      if (!hasAllowedRole) {
        router.push("/unauthorized");
        return;
      }
    }
  }, [isAuthenticated, user, isLoading, pathname, router, redirectTo, allowedRoles]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!isAuthenticated) {
    return <LoadingSkeleton />;
  }

  if (user && allowedRoles.length > 0) {
    const hasAllowedRole = allowedRoles.includes(user.is_admin ? "admin" : "user");
    if (!hasAllowedRole) {
      return <LoadingSkeleton />;
    }
  }

  return <>{children}</>;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen space-y-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
