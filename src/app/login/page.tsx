"use client";

import {
  FormEvent,
  useEffect,
  useId,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const emailId = useId();
  const passwordId = useId();

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

      const { data: claimsData } =
        await supabase.auth.getClaims();

      if (claimsData?.claims?.sub) {
        // Fetch role from profiles table.
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", claimsData.claims.sub)
          .single();

        const role =
          profile?.role === "tutor" ||
          profile?.role === "student"
            ? profile.role
            : null;

        if (role === "tutor") {
          router.replace("/tutor");
          return;
        }

        if (role === "student") {
          router.replace("/student");
          return;
        }
      }

      setCheckingAuth(false);
    }

    checkExistingSession();
  }, [router]);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError(
        "Please enter both email and password."
      );
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
      const {
        data,
        error: authError,
      } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

      if (authError) {
        setError(
          authError.message ||
            "Invalid email or password."
        );
        setLoading(false);
        return;
      }

      if (data.user) {
        // Fetch authoritative server-side profile role.
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        const role =
          profile?.role === "tutor" ||
          profile?.role === "student"
            ? profile.role
            : null;

        if (role === "tutor") {
          router.push("/tutor");
          return;
        }

        if (role === "student") {
          router.push("/student");
          return;
        }

        setError(
          "Account role could not be resolved. Please contact support."
        );
        setLoading(false);
      }
    } catch {
      setError(
        "An unexpected authentication error occurred. Please try again."
      );
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div
          role="status"
          aria-live="polite"
          className="text-sm text-text-secondary"
        >
          Checking authentication status...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:flex sm:items-center sm:justify-center sm:px-6">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            T
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            TutorFlow
          </h1>

          <p className="mt-2 text-sm text-text-secondary">
            Sign in to your tutor or student account.
          </p>
        </div>

        {/* Login surface */}
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="border-t-2 border-primary px-6 py-6 sm:px-8">
            {(!isConfigured || error) && (
              <div className="mb-6 space-y-3">
                {!isConfigured && (
                  <div
                    role="alert"
                    className="rounded-md border border-warning-border bg-warning-background p-4 text-sm text-warning"
                  >
                    <p className="font-semibold">
                      Authentication is not configured.
                    </p>

                    <p className="mt-1.5 leading-6">
                      Configure your{" "}
                      <code className="rounded bg-yellow-100 px-1 py-0.5 font-mono text-xs">
                        .env.local
                      </code>{" "}
                      file with the required Supabase
                      environment variables.
                    </p>
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="rounded-md border border-error-border bg-error-background p-4 text-sm text-error"
                  >
                    {error}
                  </div>
                )}
              </div>
            )}

            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor={emailId}
                  className="block text-sm font-medium text-text-primary"
                >
                  Email address
                </label>

                <input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  disabled={loading || !isConfigured}
                  aria-invalid={Boolean(error)}
                  className="ui-control mt-2 placeholder:text-text-muted disabled:cursor-not-allowed"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor={passwordId}
                    className="block text-sm font-medium text-text-primary"
                  >
                    Password
                  </label>
                </div>

                <input
                  id={passwordId}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  disabled={loading || !isConfigured}
                  className="ui-control mt-2 placeholder:text-text-muted disabled:cursor-not-allowed"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !isConfigured}
                className="ui-button-primary w-full py-3"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-6 border-t border-border pt-5">
              <p className="text-center text-xs leading-5 text-text-muted">
                Student accounts are created directly by
                your assigned tutor. There is no public
                registration.
              </p>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-text-muted">
          Secure access to your tutoring workspace.
        </p>
      </div>
    </main>
  );
}