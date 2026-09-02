"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateSessionReviewForSession } from "./actions";

type SessionAIReviewProps = {
  sessionId: string;
  hasNotes: boolean;
  review: {
    id: string;
    summary: string;
    next_session_suggestion: string;
  } | null;
};

export default function SessionAIReview({
  sessionId,
  hasNotes,
  review,
}: SessionAIReviewProps) {
  const router = useRouter();

  const [error, setError] = useState<string | null>(
    null
  );

  const [isPending, startTransition] =
    useTransition();

  const handleGenerateReview = () => {
    setError(null);

    if (!hasNotes) {
      setError(
        "Add session notes before generating an AI review."
      );
      return;
    }

    startTransition(async () => {
      const result =
        await generateSessionReviewForSession(
          sessionId
        );

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="mt-5 border-t border-slate-200 pt-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              AI Session Review
            </h4>

            <p className="mt-1 text-xs text-slate-500">
              Review the session and prepare the next
              learning step.
            </p>
          </div>

          {review && (
            <span className="inline-flex w-fit items-center rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
              AI Ready
            </span>
          )}
        </div>

        {review ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div>
              <h5 className="text-sm font-semibold text-slate-900">
                Session Summary
              </h5>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                {review.summary}
              </p>
            </div>

            <div className="mt-5 border-t border-violet-100 pt-5">
              <h5 className="text-sm font-semibold text-slate-900">
                Next Session Suggestion
              </h5>

              <p className="mt-2 text-sm leading-6 text-slate-700">
                {review.next_session_suggestion}
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateReview}
              disabled={isPending || !hasNotes}
              className="mt-5 rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? "Regenerating..."
                : "Regenerate Review"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-600">
              {hasNotes
                ? "Use the session notes to generate a personalized AI review."
                : "Add session notes before generating an AI review."}
            </p>

            <button
              type="button"
              onClick={handleGenerateReview}
              disabled={isPending || !hasNotes}
              className="mt-4 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              {isPending
                ? "Generating Review..."
                : "Generate AI Review"}
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}