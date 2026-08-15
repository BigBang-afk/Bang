"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { registerSchema, type RegisterInput } from "@/lib/validation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json();

    if (!res.ok) {
      setServerError(body.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setLoading(false);

    if (signInRes?.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {serverError && (
        <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {serverError}
        </div>
      )}

      <Input
        label="Full name"
        id="name"
        type="text"
        placeholder="Jordan Lee"
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />
      <Input
        label="Email"
        id="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Input
        label="Password"
        id="password"
        type="password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" disabled={loading} className="mt-2 w-full">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Create free account
      </Button>

      <p className="text-center text-xs text-foreground-muted">
        By signing up you agree to our Terms and Privacy Policy.
      </p>

      <p className="text-center text-sm text-foreground-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-green hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
