"use client";

import { AdminSidebar, AdminMobileNav } from "./admin-sidebar";
import { AdminBreadcrumbs } from "./admin-breadcrumbs";

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <AdminMobileNav />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <div className="border-b px-6 py-3">
            <AdminBreadcrumbs />
          </div>
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
