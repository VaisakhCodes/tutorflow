"use client";

import { useState } from "react";
import { generateProgressSummaryForStudent } from "@/app/tutor/actions";

type ProgressSummary = {
  summary: string;
  improving_areas: string[];
  struggling_areas: string[];
};

type ProgressAISummaryProps = {
  studentId: string;
};

export default function ProgressAISummary({
  studentId,
}: ProgressAISummaryProps) {
  const [summary, setSummary] =
    useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const result =
        await generateProgressSummaryForStudent(
          studentId
        );

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSummary(result.progressSummary);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate the progress summary."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-8 rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            AI Progress Summary
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Analyze past session reviews to identify improvement
            and remaining challenges.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="w-fit rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Generating..."
            : "Generate Progress Summary"}
        </button>
      </div>

      {error ? (
        <div className="px-6 py-5">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      ) : summary ? (
        <div className="space-y-6 px-6 py-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Overall Progress
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              {summary.summary}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-emerald-700">
                Improving
              </h3>

              <ul className="mt-3 space-y-2">
                {summary.improving_areas.map(
                  (area, index) => (
                    <li
                      key={`${area}-${index}`}
                      className="text-sm leading-6 text-slate-700"
                    >
                      <span className="mr-2 text-emerald-600">
                        ✓
                      </span>
                      {area}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-amber-700">
                Still Struggling
              </h3>

              <ul className="mt-3 space-y-2">
                {summary.struggling_areas.map(
                  (area, index) => (
                    <li
                      key={`${area}-${index}`}
                      className="text-sm leading-6 text-slate-700"
                    >
                      <span className="mr-2 text-amber-600">
                        •
                      </span>
                      {area}
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 py-8 text-sm text-slate-500">
          Generate a summary to see where the student is
          improving and where additional support is needed.
        </div>
      )}
    </section>
  );
}