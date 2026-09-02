"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-blue-600">
              TutorFlow
            </span>
          </div>

          <div className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
            Tutoring Platform
          </div>
        </div>
      </header>

      {/* Main Hero */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mb-6 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Tutoring Platform
          </span>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            TutorFlow
          </h1>

          <p className="mb-8 text-lg leading-relaxed text-slate-600 sm:text-xl">
            A simple platform for tutors to manage students, run sessions,
            and use AI to plan and review lessons.
          </p>

          <div className="flex justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white shadow-sm transition duration-150 hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Feature Overview Grid */}
        <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-lg font-bold text-blue-600">
              1
            </div>

            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              Student Profiles
            </h2>

            <p className="text-sm leading-relaxed text-slate-600">
              Track student current levels, subject focus, learning goals,
              and specific weak areas seamlessly.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-lg font-bold text-blue-600">
              2
            </div>

            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              Session Lifecycle
            </h2>

            <p className="text-sm leading-relaxed text-slate-600">
              Schedule, launch, conduct, and complete sessions with strict
              state management and autosaving notes.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-lg font-bold text-blue-600">
              3
            </div>

            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              AI Lesson Assistant
            </h2>

            <p className="text-sm leading-relaxed text-slate-600">
              Generate customized lesson plans before each session and
              comprehensive reviews after completion.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-5xl px-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
          <p>
            © 2026 TutorFlow. Built for simple and effective tutoring
            workflows.
          </p>
        </div>
      </footer>
    </div>
  );
}