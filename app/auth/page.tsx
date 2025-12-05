// app/auth/page.tsx
import { AuthForm } from "@/components/auth/auth-form";

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <AuthForm />
      </div>
    </main>
  );
}
