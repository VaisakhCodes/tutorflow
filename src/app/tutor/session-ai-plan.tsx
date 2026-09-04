"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateSessionPlanForSession } from "./actions";

type SessionAIPlanData = {
  id: string;
  objectives: string[];
  lesson_outline: string[];
  practice_questions: string[];
};

type SessionAIPlanProps = {
  sessionId: string;
  plan: SessionAIPlanData | null;
};

export default function SessionAIPlan({
  sessionId,
  plan,
}: SessionAIPlanProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);

    startTransition(async () => {
      const result = await generateSessionPlanForSession(sessionId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="mt-5 border-t border-border pt-5">
      {!plan ? (
        <>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="ui-button-secondary"
          >
            {isPending ? "Generating AI Plan..." : "Generate AI Plan"}
          </button>

          {error && (
            <div className="mt-3 rounded-[var(--radius-sm)] border border-error-border bg-error-background p-3 text-sm text-error">
              {error}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-[var(--radius-md)] border border-l-4 border-border border-l-ai bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold text-text-primary">
                AI Session Plan
              </h4>

              <p className="mt-1 text-xs text-text-secondary">
                Personalized from the student profile and previous
                sessions.
              </p>
            </div>

            <span className="ui-badge-ai">AI Ready</span>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <h5 className="text-sm font-semibold text-text-primary">
                Learning Objectives
              </h5>

              <ol className="mt-2 space-y-2">
                {plan.objectives.map((objective, index) => (
                  <li
                    key={`${plan.id}-objective-${index}`}
                    className="flex gap-3 text-sm text-text-secondary"
                  >
                    <span className="font-semibold text-text-muted">
                      {index + 1}.
                    </span>

                    <span>{objective}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h5 className="text-sm font-semibold text-text-primary">
                Lesson Outline
              </h5>

              <ol className="mt-2 space-y-2">
                {plan.lesson_outline.map((step, index) => (
                  <li
                    key={`${plan.id}-outline-${index}`}
                    className="flex gap-3 text-sm text-text-secondary"
                  >
                    <span className="font-semibold text-text-muted">
                      {index + 1}.
                    </span>

                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h5 className="text-sm font-semibold text-text-primary">
                Practice Questions
              </h5>

              <ol className="mt-2 space-y-2">
                {plan.practice_questions.map((question, index) => (
                  <li
                    key={`${plan.id}-question-${index}`}
                    className="flex gap-3 text-sm text-text-secondary"
                  >
                    <span className="font-semibold text-text-muted">
                      {index + 1}.
                    </span>

                    <span>{question}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
