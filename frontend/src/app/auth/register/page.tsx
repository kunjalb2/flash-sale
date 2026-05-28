"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/auth-store";
import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthLogo } from "@/components/auth/auth-logo";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthInput } from "@/components/auth/auth-input";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthButton } from "@/components/auth/auth-button";
import { AuthErrorAlert } from "@/components/auth/auth-error-alert";
import { AuthFooterLinks } from "@/components/auth/auth-footer-links";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const registerSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    full_name: z.string().min(1, "Name is required").max(255, "Name is too long"),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading, error, clearError, isAuthenticated, initialize } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace("/events");
    }
  }, [isAuthenticated, isLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      full_name: "",
      acceptTerms: false,
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    clearError();

    try {
      await registerUser({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
      });
      router.replace("/events");
    } catch {
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
            <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">
              Join SeatFlow to start booking events
            </p>
          </div>
        </div>

        <AuthCard
          title="Sign up"
          description="Enter your information to create your account"
          footer={
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-foreground transition-colors hover:underline"
              >
                Sign in
              </Link>
            </p>
          }
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <AuthErrorAlert message={error || ""} onDismiss={clearError} />

            <AuthInput
              id="full_name"
              label="Full name"
              placeholder="John Doe"
              error={errors.full_name?.message}
              disabled={isLoading || isSubmitting}
              autoComplete="name"
              {...register("full_name")}
            />

            <AuthInput
              id="email"
              label="Email"
              type="email"
              placeholder="name@example.com"
              error={errors.email?.message}
              disabled={isLoading || isSubmitting}
              autoComplete="email"
              {...register("email")}
            />

            <PasswordInput
              id="password"
              label="Password"
              placeholder="Create a password"
              error={errors.password?.message}
              showStrength
              disabled={isLoading || isSubmitting}
              autoComplete="new-password"
              {...register("password")}
            />

            <AuthInput
              id="confirmPassword"
              label="Confirm password"
              type="password"
              placeholder="Confirm your password"
              error={errors.confirmPassword?.message}
              disabled={isLoading || isSubmitting}
              autoComplete="new-password"
              {...register("confirmPassword")}
            />

            <div className="flex items-start gap-3">
              <Checkbox
                id="acceptTerms"
                {...register("acceptTerms")}
                disabled={isLoading || isSubmitting}
                className={cn(
                  "mt-0.5 transition-colors",
                  errors.acceptTerms && "border-destructive"
                )}
              />
              <label
                htmlFor="acceptTerms"
                className={cn(
                  "text-sm leading-5 cursor-pointer transition-colors",
                  errors.acceptTerms ? "text-destructive" : "text-muted-foreground"
                )}
              >
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="font-medium text-foreground transition-colors hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-foreground transition-colors hover:underline"
                >
                  Privacy Policy
                </Link>
              </label>
            </div>

            <AuthButton
              type="submit"
              loading={isLoading || isSubmitting}
              loadingText="Creating account..."
              disabled={!isValid || !isDirty}
              className="w-full"
            >
              Create account
            </AuthButton>
          </form>
        </AuthCard>

        <AuthFooterLinks
          links={[
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
          ]}
        />
      </div>
    </AuthLayout>
  );
}
