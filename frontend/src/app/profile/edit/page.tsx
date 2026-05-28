"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Shell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/guards/auth-guard";
import { useAuthStore } from "@/stores/auth-store";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";

const profileSchema = z.object({
  full_name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name is too long"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileEditPage() {
  return (
    <AuthGuard>
      <ProfileEditContent />
    </AuthGuard>
  );
}

function ProfileEditContent() {
  const { user, refreshUser } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name ?? "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setSubmitting(true);
    try {
      await apiClient.put("/auth/me", data);
      await refreshUser();
      toast({
        title: "Profile updated",
        description: "Your name has been updated successfully.",
      });
      router.push("/profile");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast({
        title: "Update failed",
        description: err.response?.data?.detail || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Shell>
      <div className="container py-8 md:py-12 max-w-2xl">
        <div className="space-y-8">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
              <Link href="/profile" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Profile
              </Link>
            </Button>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Edit Profile
            </h1>
            <p className="text-muted-foreground text-lg mt-2">
              Update your account information
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    placeholder="Enter your full name"
                    {...register("full_name")}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">
                      {errors.full_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {submitting ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/profile">Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
