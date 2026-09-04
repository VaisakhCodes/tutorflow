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
      <header className="border-b-2 border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-text-primary"
            aria-label="TutorFlow home"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-primary text-sm font-bold text-primary-foreground">
              T
            </span>
            TutorFlow
          </Link>

          <span className="text-xs font-medium uppercase tracking-[0.1em] text-text-muted">
            Tutoring Platform
          </span>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:pt-24">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="max-w-2xl">
              <span className="ui-badge-warning">Tutoring Platform</span>

              <h1 className="mt-5 font-serif text-5xl font-semibold leading-[1.05] tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
                TutorFlow
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
                A simple platform for tutors to manage students, run
                sessions, and use AI to plan and review lessons.
              </p>

              <div className="mt-8 flex">
                <Link href="/login" className="ui-button-primary px-6 py-3">
                  Get Started
                </Link>
              </div>
            </div>

            <div className="hidden border-l-2 border-border pl-8 lg:block">
              <p className="text-sm leading-7 text-text-muted">
                Built for tutors who want student context, session activity,
                and lesson planning in one workspace — without the
                complexity of a generic CRM.
              </p>
            </div>
          </div>
        </section>

        {/* Product capabilities */}
        <section className="border-t-2 border-border bg-surface-muted">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Core workflow
              </p>

              <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
                Everything needed for a tutoring session
              </h2>

              <p className="mt-3 text-sm leading-6 text-text-secondary sm:text-base">
                Keep student context, session activity, and AI-assisted
                planning together without adding unnecessary complexity.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.number}
                  className="ui-card border-t-2 border-t-primary px-6 py-7"
                >
                  <p className="font-serif text-3xl font-semibold text-primary">
                    {feature.number}
                  </p>

                  <h3 className="mt-4 text-lg font-semibold text-text-primary">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-text-secondary">
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
