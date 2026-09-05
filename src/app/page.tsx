"use client";

import Image from "next/image";
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Student Profiles",
    description:
      "Track student levels, subject focus, learning goals, and specific weak areas in one place.",
    label: "Student context",
  },
  {
    number: "02",
    title: "Session Lifecycle",
    description:
      "Schedule, launch, conduct, and complete sessions with clear state management and session notes.",
    label: "Session management",
  },
  {
    number: "03",
    title: "AI Lesson Assistant",
    description:
      "Generate customized lesson plans before sessions and structured reviews after completion.",
    label: "AI-assisted planning",
  },
];

function StudentProfileIcon() {
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
      <circle cx="9" cy="7" r="4" />
      <path d="M2.5 21a6.5 6.5 0 0 1 13 0" />
      <path d="M18 8v6" />
      <path d="M21 11h-6" />
    </svg>
  );
}

function SessionCalendarIcon() {
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
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function AiSparkIcon() {
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
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="relative z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <Link
            href="/"
            className="shrink-0 transition-opacity duration-200 hover:opacity-80"
            aria-label="TutorFlow home"
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
          </Link>

          {/* Desktop navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-8 md:flex"
          >
            <Link
              href="/"
              className="text-sm font-medium text-text-primary transition-colors hover:text-primary"
            >
              Home
            </Link>

            <a
              href="#workflow"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Workflow
            </a>

            <a
              href="#progress"
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Progress
            </a>
          </nav>

          {/* Header action */}
          <div className="flex items-center">
            <Link
              href="/login"
              className="ui-button-primary px-4 py-2.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {/* Hero */}
        <section className="relative bg-background">
          {/* Desktop blended artwork */}
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[68%] lg:block">
            <Image
              src="/images/home/home-hero.png"
              alt=""
              fill
              priority
              sizes="68vw"
              className="object-cover object-right"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 via-[18%] to-transparent" />

            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background to-transparent" />

            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center lg:min-h-[560px] lg:grid-cols-[0.82fr_1.18fr] lg:gap-10">
              {/* Hero copy */}
              <div className="relative z-10 max-w-xl py-14 sm:py-16 lg:py-16">
                <span className="ui-badge-warning">
                  Tutoring Platform
                </span>

                <h1 className="mt-5 max-w-lg font-serif text-5xl font-semibold leading-[1.02] tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
                  TutorFlow
                </h1>

                <p className="mt-6 max-w-xl text-base leading-7 text-text-secondary sm:text-lg sm:leading-8">
                  A simple platform for tutors to manage students, run
                  sessions, and use AI to plan and review lessons.
                </p>

                <div className="mt-8">
                  <Link
                    href="/login"
                    className="ui-button-primary px-6 py-3"
                  >
                    Get Started
                  </Link>
                </div>

                <div className="mt-8 max-w-md border-l-2 border-border pl-5">
                  <p className="text-sm leading-6 text-text-muted">
                    Built for tutors who want student context, session
                    activity, and lesson planning in one workspace — without
                    the complexity of a generic CRM.
                  </p>
                </div>
              </div>

              {/* Mobile hero artwork */}
              <div className="relative -mx-4 min-h-[260px] overflow-hidden sm:-mx-6 sm:min-h-[320px] lg:hidden">
                <Image
                  src="/images/home/home-hero.png"
                  alt="Student using TutorFlow learning and session tools"
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover object-center"
                />

                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent" />

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
              </div>
            </div>
          </div>
        </section>

        {/* Core workflow */}
        <section
          id="workflow"
          className="relative bg-background"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Core workflow
              </p>

              <h2 className="mt-3 max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-tight text-text-primary sm:text-4xl">
                Everything needed for a tutoring session
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
                Keep student context, session activity, and AI-assisted
                planning together without adding unnecessary complexity.
              </p>
            </div>

            <div className="mt-12 grid items-center gap-8 lg:grid-cols-[0.9fr_1.5fr_0.9fr] lg:gap-8">
              {/* Student Profiles */}
              <article className="group relative w-full max-w-sm justify-self-center overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface px-6 py-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md lg:justify-self-start">
                <div className="absolute inset-x-0 top-0 h-1 bg-primary" />

                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-serif text-lg font-semibold text-primary">
                    {features[0].number}
                  </div>

                  <span
                    className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"
                    aria-hidden="true"
                  >
                    <StudentProfileIcon />
                  </span>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold tracking-tight text-text-primary">
                    {features[0].title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-text-secondary">
                    {features[0].description}
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-2 text-xs font-medium text-text-muted">
                  <span className="h-px w-8 bg-border-strong" />
                  {features[0].label}
                </div>
              </article>

              {/* Workflow visual */}
              <div className="relative flex min-h-[360px] items-center justify-center sm:min-h-[420px] lg:min-h-[470px]">
                <div
                  className="relative h-[340px] w-full max-w-[720px] sm:h-[400px] lg:h-[450px]"
                  style={{
                    maskImage:
                      "radial-gradient(ellipse 76% 72% at center, black 56%, transparent 94%)",
                    WebkitMaskImage:
                      "radial-gradient(ellipse 76% 72% at center, black 56%, transparent 94%)",
                  }}
                >
                  <Image
                    src="/images/home/home-session-workflow.png"
                    alt="Tutor and student working together during a tutoring session"
                    fill
                    sizes="(max-width: 1024px) 100vw, 48vw"
                    className="object-cover object-center"
                  />

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background/95 to-transparent" />
                </div>
              </div>

              {/* Session + AI */}
              <div className="flex w-full max-w-sm flex-col gap-5 justify-self-center lg:justify-self-end">
                {/* Session Lifecycle */}
                <article className="group relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface px-6 py-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
                  <div className="absolute inset-x-0 top-0 h-1 bg-accent" />

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 font-serif text-lg font-semibold text-accent">
                      {features[1].number}
                    </div>

                    <span
                      className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent"
                      aria-hidden="true"
                    >
                      <SessionCalendarIcon />
                    </span>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-semibold tracking-tight text-text-primary">
                      {features[1].title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-text-secondary">
                      {features[1].description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-xs font-medium text-text-muted">
                    <span className="h-px w-8 bg-border-strong" />
                    {features[1].label}
                  </div>
                </article>

                {/* AI Lesson Assistant */}
                <article className="group relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface px-6 py-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md">
                  <div className="absolute inset-x-0 top-0 h-1 bg-primary" />

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-serif text-lg font-semibold text-primary">
                      {features[2].number}
                    </div>

                    <span
                      className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"
                      aria-hidden="true"
                    >
                      <AiSparkIcon />
                    </span>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-semibold tracking-tight text-text-primary">
                      {features[2].title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-text-secondary">
                      {features[2].description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-xs font-medium text-text-muted">
                    <span className="h-px w-8 bg-border-strong" />
                    {features[2].label}
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* Progress banner */}
        <section
          id="progress"
          className="relative bg-background"
        >
          <div className="relative w-full overflow-hidden">
            <div
              className="relative w-full"
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, black 7%, black 93%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, black 7%, black 93%, transparent 100%)",
              }}
            >
              <Image
                src="/images/home/home-progress-banner.png"
                alt="Learning environment representing engagement, progress, and brighter futures"
                width={2000}
                height={800}
                sizes="100vw"
                className="block h-auto w-full object-contain object-center"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-background">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-center px-4 py-5 text-center sm:px-6 lg:px-8">
          <p className="text-xs text-text-muted">
            © 2026 TutorFlow. Built for simple and effective tutoring
            workflows.
          </p>
        </div>
      </footer>
    </div>
  );
}