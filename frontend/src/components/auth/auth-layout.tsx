import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: ReactNode;
  className?: string;
  showPattern?: boolean;
}

export function AuthLayout({ children, className, showPattern = true }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {showPattern && (
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div
            className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/95" />
        </div>
      )}
      <main className={cn("flex-1 flex items-center justify-center p-4 sm:p-8", className)}>
        {children}
      </main>
    </div>
  );
}
