"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, UserPlus, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

const schema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { error: apiError } = await api.POST("/auth/register", {
        body: {
          username: data.email,
          password: data.password,
        },
      });

      if (apiError) {
          if (typeof apiError === "object" && (apiError as any).detail) {
              toast((apiError as any).detail, "error");
          } else {
              toast("Registration failed. Email might already be in use.", "error");
          }
        return;
      }

      toast("Account created successfully! Redirecting to login...", "success");
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      toast("An unexpected error occurred", "error");
      console.error(err);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-emerald-50/20">
        <Card className="w-full max-w-md text-center p-8 glass animate-in zoom-in duration-500">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 size={48} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold mb-2 text-emerald-950 font-brand">Welcome to the Kitchen!</CardTitle>
          <CardDescription className="text-lg">
            Your account has been created. Redirecting you to login...
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4">
      <div className="w-full max-w-md animate-in slide-up duration-700">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-2xl mb-4 text-emerald-600 shadow-sm border border-emerald-50">
                <UserPlus size={24} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-emerald-950 font-brand">Create Account</h1>
            <p className="text-slate-600 mt-2">Join our community of AI-powered chefs</p>
        </div>

        <Card className="shadow-2xl shadow-emerald-900/5 border-white/40 glass overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          <CardHeader>
            <CardTitle className="font-brand text-xl">Sign Up</CardTitle>
            <CardDescription>
              Start scanning your pantry and generating delicious recipes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="fullName">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  {...register("fullName")}
                  className={errors.fullName ? "border-destructive focus-visible:ring-destructive" : "bg-white/50"}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive mt-1 font-medium">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  {...register("email")}
                  className={errors.email ? "border-destructive focus-visible:ring-destructive" : "bg-white/50"}
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  className={errors.password ? "border-destructive focus-visible:ring-destructive" : "bg-white/50"}
                />
                {errors.password && (
                  <p className="text-xs text-destructive mt-1 font-medium">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register("confirmPassword")}
                  className={errors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : "bg-white/50"}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive mt-1 font-medium">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-200"
                  size="lg"
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-slate-100 bg-slate-50/50 p-4">
            <p className="text-sm text-slate-600">
                Already have an account?{" "}
                <Link href="/login" className="text-emerald-700 font-bold hover:underline">
                  Sign in
                </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
