"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { Shell } from "@/components/layout/shell";

export default function MockCheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown <= 0 && sessionId) {
      const successUrl = `/checkout/success?session_id=${sessionId}`;
      router.push(successUrl);
    }
  }, [countdown, sessionId, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Shell>
      <div className="container py-16 max-w-2xl">
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-500" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Mock Payment - Sandbox Mode
            </h1>
            <p className="text-muted-foreground">
              Simulating successful payment. Redirecting in {countdown}s...
            </p>
          </div>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    </Shell>
  );
}
