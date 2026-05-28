"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/auth-store";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthLogo } from "@/components/auth/auth-logo";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthErrorAlert } from "@/components/auth/auth-error-alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/events";
  const { login, isLoading, error, clearError, isAuthenticated, initialize } = useAuthStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, dirtyFields },
    watch,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const watchedPassword = watch("password");

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    clearError();

    try {
      await login(data);
      toast({ variant: "default", title: "Welcome back!", description: "You have successfully signed in." });
      router.replace(redirectTo);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in. Please try again.";
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[420px] space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <AuthLogo variant="compact" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your SeatFlow account
            </p>
          </div>
        </div>

        <AuthCard
          title="Sign in"
          footer={
            <div className="space-y-4">
              <div className="text-center text-sm">
                <span className="text-muted-foreground">Don&apos;t have an account? </span>
                <Link
                  href="/auth/register"
                  className="font-medium text-foreground transition-colors hover:underline"
                >
                  Sign up
                </Link>
              </div>

              <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
                <span>•</span>
                <Link href="/terms" className="hover:underline">Terms of Service</Link>
                <span>•</span>
                <Link href="/auth/forgot-password" className="hover:underline">Forgot password?</Link>
              </div>
            </div>
          }
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <AuthErrorAlert message={error || ""} onDismiss={clearError} />

            {/* Social Auth */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-10"
                onClick={() => {
                  toast({ title: "Info", description: "Google sign-in coming soon!" });
                }}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              <Separator className="my-4" />
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                  errors.email ? "border-destructive focus-visible:ring-destructive" : ""
                )}
                disabled={isLoading || isSubmitting}
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                  errors.password ? "border-destructive focus-visible:ring-destructive" : ""
                )}
                disabled={isLoading || isSubmitting}
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}

              {/* Password Strength Indicator */}
              {dirtyFields.password && watchedPassword && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i <= getPasswordStrength(watchedPassword)
                            ? getPasswordStrengthColor(watchedPassword)
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getPasswordStrengthLabel(watchedPassword)}
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              loading={isLoading || isSubmitting}
              loadingText="Signing in..."
              disabled={!isValid}
              className="w-full h-11"
              size="lg"
            >
              Sign in
            </Button>
          </form>
        </AuthCard>
      </div>
    </AuthLayout>
  );
}

function getPasswordStrength(password: string): number {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  return Math.min(strength, 4);
}

function getPasswordStrengthColor(password: string): string {
  const strength = getPasswordStrength(password);
  if (strength <= 1) return "bg-destructive";
  if (strength === 2) return "bg-warning";
  if (strength === 3) return "bg-success";
  return "bg-success";
}

function getPasswordStrengthLabel(password: string): string {
  const strength = getPasswordStrength(password);
  if (strength <= 1) return "Weak";
  if (strength === 2) return "Fair";
  if (strength === 3) return "Good";
  return "Strong";
}