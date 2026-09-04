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
    <section className="mb-8 rounded-lg border border-border bg-surface">
      <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            AI Progress Summary
          </h2>

          <p className="mt-1 text-sm text-text-secondary">
            Analyze past session reviews to identify improvement
            and remaining challenges.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="ui-button-primary w-fit"
        >
          {loading
            ? "Generating..."
            : "Generate Progress Summary"}
        </button>
      </div>

      {error ? (
        <div className="px-6 py-5">
          <div className="rounded-md border border-error-border bg-error-background p-4 text-sm text-error">
            {error}
          </div>
        </div>
      ) : summary ? (
        <div className="space-y-6 px-6 py-6">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Overall Progress
            </h3>

            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {summary.summary}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-success">
                Improving
              </h3>

              <ul className="mt-3 space-y-2">
                {summary.improving_areas.map(
                  (area, index) => (
                    <li
                      key={`${area}-${index}`}
                      className="text-sm leading-6 text-text-secondary"
                    >
                      <span className="mr-2 text-success">
                        ✓
                      </span>
                      {area}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-warning">
                Still Struggling
              </h3>

              <ul className="mt-3 space-y-2">
                {summary.struggling_areas.map(
                  (area, index) => (
                    <li
                      key={`${area}-${index}`}
                      className="text-sm leading-6 text-text-secondary"
                    >
                      <span className="mr-2 text-warning">
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
        <div className="px-6 py-8 text-sm text-text-secondary">
          Generate a summary to see where the student is
          improving and where additional support is needed.
        </div>
      )}
    </section>
  );
}