"use client";

import { AuthGuard } from "@/guards/auth-guard";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true} requireAdmin={true}>
      <AdminShell>{children}</AdminShell>
    </AuthGuard>
  );
}
