'use client';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight text-blue-600">
              TutorFlow
            </span>
          </div>
          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            Step 1 Foundation
          </div>
        </div>
      </header>

      {/* Main Hero */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-6">
            Tutoring Platform Scaffolding
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-6">
            TutorFlow
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
            A simple platform for tutors to manage students, run sessions, and use AI to plan and review lessons.
          </p>
          <div className="flex justify-center">
            <button
              type="button"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition duration-150 cursor-pointer"
              onClick={() => alert("Get Started functionality will be available in future steps.")}
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Feature Overview Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-between justify-center font-bold text-lg mb-4">
              1
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Student Profiles
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Track student current levels, subject focus, learning goals, and specific weak areas seamlessly.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-4">
              2
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Session Lifecycle
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Schedule, launch, conduct, and complete sessions with strict state management and autosaving notes.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-4">
              3
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              AI Lesson Assistant
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Generate customized lesson plans before each session and comprehensive reviews after completion.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          <p>© 2026 TutorFlow. Built for simple and effective tutoring workflows.</p>
        </div>
      </footer>
    </div>
  );
}
