"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    async function checkExistingSession() {
      const supabase = createClient();
      if (!supabase) {
        setIsConfigured(false);
        setCheckingAuth(false);
        return;
      }

      const { data: claimsData } = await supabase.auth.getClaims();
      if (claimsData?.claims?.sub) {
        // Fetch role from profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", claimsData.claims.sub)
          .single();

        const role = profile?.role || claimsData.claims.role;
        if (role === "tutor") {
          router.replace("/tutor");
          return;
        } else if (role === "student") {
          router.replace("/student");
          return;
        }
      }
      setCheckingAuth(false);
    }

    checkExistingSession();
  }, [router]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError(
        "Supabase credentials are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local."
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) {
        setError(authError.message || "Invalid email or password.");
        setLoading(false);
        return;
      }

      if (data.user) {
        // Fetch authoritative server-side profile role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        const role = profile?.role || data.user.user_metadata?.role;

        if (role === "tutor") {
          router.push("/tutor");
        } else if (role === "student") {
          router.push("/student");
        } else {
          setError(
            "Account role could not be resolved. Please contact support."
          );
          setLoading(false);
        }
      }
    } catch {
      setError("An unexpected authentication error occurred. Please try again.");
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <p className="text-slate-500 text-sm">Checking authentication status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          TutorFlow
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to your tutor or student account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10">
          {!isConfigured && (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
              <strong>Supabase Unconfigured:</strong> Environment variables (
              <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">
                NEXT_PUBLIC_SUPABASE_URL
              </code>
              ) are not set. Configure your <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env.local</code> file to enable authentication.
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-xs placeholder-slate-400 focus:outline-hidden focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="you@example.com"
                  disabled={loading || !isConfigured}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-xs placeholder-slate-400 focus:outline-hidden focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="••••••••"
                  disabled={loading || !isConfigured}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !isConfigured}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer transition"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-xs text-slate-500">
              Student accounts are created directly by your assigned tutor. No public registration available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
