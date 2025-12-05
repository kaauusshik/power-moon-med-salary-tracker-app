"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, UserPlus } from "lucide-react";
import Image from "next/image";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setLoading(true);

    const { email, password } = values;

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }
      }

      // On success, go to dashboard
      router.push("/");
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "signin" ? "signup" : "signin"));
    setError(null);
  };

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
      <div className="mb-4 text-center">
        <div className="text-2xl font-semibold tracking-tight">
          <Image
            src="/pmtmed_icon_512px.png"
            alt="Logo"
            width={24}
            height={24}
            className="inline-block mr-2"
          />
          Power Moon TechMed Pvt.Ltd
        </div>

        <h1 className="text-lg font-semibold tracking-tight">
          {mode === "signin" ? "Sign in" : "Create an account"}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {mode === "signin"
            ? "Welcome back. Enter your details to continue."
            : "Start tracking salaries for your team."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            name="email"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            name="password"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? (
              "Please wait..."
            ) : mode === "signin" ? (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create account
              </>
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={toggleMode}
          className="text-xs text-muted-foreground hover:underline"
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </Card>
  );
}
