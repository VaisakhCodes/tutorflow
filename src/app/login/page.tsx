"use client";

import {
  FormEvent,
  useEffect,
  useId,
  useState,
} from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2.5 2.5 0 0 0 3.5 3.5" />
      <path d="M9.9 5.3A10.5 10.5 0 0 1 12 5c6 0 9.5 7 9.5 7a17.7 17.7 0 0 1-3.2 3.8" />
      <path d="M6.2 6.3C3.7 8.1 2.5 12 2.5 12s3.5 7 9.5 7c1 0 2-.2 2.9-.5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

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
  const [showPassword, setShowPassword] = useState(false);

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
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", claimsData.claims.sub)
          .single();

        const role =
          profile?.role === "tutor" || profile?.role === "student"
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

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      const { data, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

      if (authError) {
        setError(authError.message || "Invalid email or password.");
        setLoading(false);
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        const role =
          profile?.role === "tutor" || profile?.role === "student"
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
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
        <Image
          src="/images/login/login-background.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-background/25" />

        <div className="relative z-10 flex flex-col items-center gap-4">
          <Image
            src="/images/brand/tutorflow-logo.png"
            alt="TutorFlow"
            width={2172}
            height={724}
            sizes="150px"
            className="h-auto w-[150px]"
          />

          <div
            role="status"
            aria-live="polite"
            className="text-sm text-text-secondary"
          >
            Checking authentication status...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Background artwork */}
      <div className="absolute inset-0">
        <Image
          src="/images/login/login-background.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-background/10 to-background/35" />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(247,248,246,0.48)_0%,rgba(247,248,246,0.22)_38%,rgba(247,248,246,0.04)_72%,transparent_100%)]" />
      </div>

      {/* Login content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 -translate-y-16 sm:-translate-y-12 sm:px-6 sm:py-12 lg:-translate-y-12">
        <div className="w-full max-w-lg">
          {/* Brand */}
          <div className="mb-7 text-center sm:mb-8">
            <a
              href="/"
              aria-label="TutorFlow home"
              className="inline-flex transition-opacity duration-200 hover:opacity-80"
            >
              <Image
                src="/images/brand/tutorflow-logo.png"
                alt="TutorFlow"
                width={2172}
                height={724}
                priority
                sizes="(max-width: 640px) 145px, 170px"
                className="h-auto w-[145px] sm:w-[170px]"
              />
            </a>

            <p className="mt-4 text-sm text-text-secondary">
              Sign in to your tutor or student account.
            </p>
          </div>

          {/* Redesigned login box */}
          <section className="relative overflow-hidden rounded-[20px] border border-white/75 bg-surface/90 shadow-[0_18px_55px_rgba(67,43,26,0.14)] backdrop-blur-md">
            {/* Centered brand accent */}
            <div
              className="absolute left-1/2 top-0 h-1 w-24 -translate-x-1/2 rounded-b-full bg-primary"
              aria-hidden="true"
            />

            <div className="px-6 py-8 sm:px-9 sm:py-9">
              {(!isConfigured || error) && (
                <div className="mb-6 space-y-3">
                  {!isConfigured && (
                    <div
                      role="alert"
                      className="rounded-[12px] border border-warning-border bg-warning-background/95 p-4 text-sm text-warning"
                    >
                      <p className="font-semibold">
                        Authentication is not configured.
                      </p>

                      <p className="mt-1.5 leading-6">
                        Configure your{" "}
                        <code className="rounded bg-surface px-1 py-0.5 font-mono text-xs">
                          .env.local
                        </code>{" "}
                        file with the required Supabase environment
                        variables.
                      </p>
                    </div>
                  )}

                  {error && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      className="rounded-[12px] border border-error-border bg-error-background/95 p-4 text-sm text-error"
                    >
                      {error}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div>
                  <label
                    htmlFor={emailId}
                    className="block text-sm font-semibold text-text-primary"
                  >
                    Email address
                  </label>

                  <div className="relative mt-2">
                    <span
                      className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-primary"
                      aria-hidden="true"
                    >
                      <MailIcon />
                    </span>

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
                      className="ui-control h-12 rounded-[12px] bg-white/75 pl-11 pr-3 placeholder:text-text-muted disabled:cursor-not-allowed"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor={passwordId}
                    className="block text-sm font-semibold text-text-primary"
                  >
                    Password
                  </label>

                  <div className="relative mt-2">
                    <span
                      className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-primary"
                      aria-hidden="true"
                    >
                      <LockIcon />
                    </span>

                    <input
                      id={passwordId}
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      disabled={loading || !isConfigured}
                      className="ui-control h-12 rounded-[12px] bg-white/75 pl-11 pr-11 placeholder:text-text-muted disabled:cursor-not-allowed"
                      placeholder="Enter your password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={loading || !isConfigured}
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-muted transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {/* Sign in button */}
                <button
                  type="submit"
                  disabled={loading || !isConfigured}
                  className="ui-button-primary flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-sm font-semibold shadow-sm"
                >
                  <span>
                    {loading ? "Signing in..." : "Sign in"}
                  </span>

                  {!loading && <ArrowRightIcon />}
                </button>
              </form>

              {/* Account information */}
              <div className="mt-6 border-t border-border/80 pt-5">
                <p className="text-center text-xs leading-5 text-text-muted">
                  Student accounts are created directly by your assigned
                  tutor. There is no public registration.
                </p>
              </div>
            </div>
          </section>

          
        </div>
      </div>
    </main>
  );
}