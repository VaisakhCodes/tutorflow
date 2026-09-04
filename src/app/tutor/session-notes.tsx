"use client";

import { useState, useTransition } from "react";
import { saveSessionNotes } from "./actions";

type SessionNotesProps = {
  sessionId: string;
  initialNotes: string;
};

export default function SessionNotes({
  sessionId,
  initialNotes,
}: SessionNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setMessage(null);
    setIsError(false);

    startTransition(async () => {
      const result = await saveSessionNotes(sessionId, notes);

      if (!result.success) {
        setIsError(true);
        setMessage(result.error);
        return;
      }

      setIsError(false);
      setMessage("Session notes saved successfully.");
    });
  };

  return (
    <div className="mt-5 border-t border-border pt-5">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-text-primary">
          Session Notes
        </h4>

        <p className="mt-1 text-xs text-text-secondary">
          Record what was covered, student progress, challenges, and
          important observations.
        </p>
      </div>

      <textarea
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          setMessage(null);
        }}
        rows={5}
        maxLength={10000}
        placeholder="Write notes about this tutoring session..."
        disabled={isPending}
        className="ui-control resize-y px-3 py-3 placeholder:text-text-muted"
      />

      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="text-xs text-text-muted">
          {notes.length}/10000
        </span>

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !notes.trim()}
          className="ui-button-primary"
        >
          {isPending ? "Saving..." : "Save notes"}
        </button>
      </div>

      {message && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            isError
              ? "border-error-border bg-error-background text-error"
              : "border-success-border bg-success-background text-success"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}