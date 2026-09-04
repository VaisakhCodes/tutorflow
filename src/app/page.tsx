"use client";

import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Student Profiles",
    description:
      "Track student levels, subject focus, learning goals, and specific weak areas in one place.",
  },
  {
    number: "02",
    title: "Session Lifecycle",
    description:
      "Schedule, launch, conduct, and complete sessions with clear state management and session notes.",
  },
  {
    number: "03",
    title: "AI Lesson Assistant",
    description:
      "Generate customized lesson plans before sessions and structured reviews after completion.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-primary"
            aria-label="TutorFlow home"
          >
            TutorFlow
          </Link>

          <span className="text-xs font-medium text-text-muted">
            Tutoring Platform
          </span>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="ui-badge-info mb-5">
              Tutoring Platform
            </span>

            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
              TutorFlow
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
              A simple platform for tutors to manage students, run sessions,
              and use AI to plan and review lessons.
            </p>

            <div className="mt-8 flex justify-center">
              <Link
                href="/login"
                className="ui-button-primary px-6 py-3"
              >
                Get Started
              </Link>
            </div>
          </div>
        </section>

        {/* Product capabilities */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                Core workflow
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
                Everything needed for a tutoring session
              </h2>

              <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
                Keep student context, session activity, and AI-assisted
                planning together without adding unnecessary complexity.
              </p>
            </div>

            <div className="mt-10 grid gap-0 border-y border-border md:grid-cols-3 md:divide-x md:divide-border">
              {features.map((feature) => (
                <article
                  key={feature.number}
                  className="border-b border-border py-7 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0"
                >
                  <p className="text-sm font-semibold tracking-wide text-primary">
                    {feature.number}
                  </p>

                  <h3 className="mt-4 text-lg font-semibold text-text-primary">
                    {feature.title}
                  </h3>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-text-secondary">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-center px-4 py-4 text-center sm:px-6">
          <p className="text-xs text-text-muted">
            © 2026 TutorFlow. Built for simple and effective tutoring
            workflows.
          </p>
        </div>
      </footer>
    </div>
  );
}