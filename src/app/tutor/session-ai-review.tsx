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

  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

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
    <div className="mt-5 border-t border-border pt-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              AI Session Review
            </h4>

            <p className="mt-1 text-xs text-text-secondary">
              Review the session and prepare the next
              learning step.
            </p>
          </div>

          {review && (
            <span className="ui-badge-ai">AI Ready</span>
          )}
        </div>

        {review ? (
          <div className="rounded-lg border border-border bg-surface p-5">
            <div>
              <h5 className="text-sm font-semibold text-text-primary">
                Session Summary
              </h5>

              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {review.summary}
              </p>
            </div>

            <div className="mt-5 border-t border-border pt-5">
              <h5 className="text-sm font-semibold text-text-primary">
                Next Session Suggestion
              </h5>

              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {review.next_session_suggestion}
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateReview}
              disabled={isPending || !hasNotes}
              className="ui-button-secondary mt-5"
            >
              {isPending
                ? "Regenerating..."
                : "Regenerate Review"}
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface-muted p-5">
            <p className="text-sm text-text-secondary">
              {hasNotes
                ? "Use the session notes to generate a personalized AI review."
                : "Add session notes before generating an AI review."}
            </p>

            <button
              type="button"
              onClick={handleGenerateReview}
              disabled={isPending || !hasNotes}
              className="ui-button-secondary mt-4"
            >
              {isPending
                ? "Generating Review..."
                : "Generate AI Review"}
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-error-border bg-error-background px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}