import { GoogleGenAI } from "@google/genai";

const PRIMARY_GEMINI_MODEL = "gemini-3.7-flash";
const FALLBACK_GEMINI_MODEL = "gemini-3.6-flash";

const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [2000, 5000];

export type SessionPlan = {
  objectives: string[];
  lesson_outline: string[];
  practice_questions: string[];
};

const SESSION_PLAN_SCHEMA = {
  type: "object",
  properties: {
    objectives: {
      type: "array",
      items: {
        type: "string",
      },
    },
    lesson_outline: {
      type: "array",
      items: {
        type: "string",
      },
    },
    practice_questions: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
  required: [
    "objectives",
    "lesson_outline",
    "practice_questions",
  ],
};

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({
    apiKey,
  });
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as {
    status?: unknown;
    code?: unknown;
    message?: unknown;
  };

  if (typeof candidate.status === "number") {
    return candidate.status;
  }

  if (typeof candidate.code === "number") {
    return candidate.code;
  }

  if (typeof candidate.message === "string") {
    const match = candidate.message.match(/\b(429|500|503|504)\b/);

    if (match) {
      return Number(match[1]);
    }
  }

  return undefined;
}

function isRetryableError(error: unknown): boolean {
  const status = getErrorStatus(error);

  return (
    status === 429 ||
    status === 500 ||
    status === 503 ||
    status === 504
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry(
  ai: GoogleGenAI,
  model: string,
  prompt: string
) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: SESSION_PLAN_SCHEMA,
        },
      });
    } catch (error) {
      const retryable = isRetryableError(error);
      const hasRetriesLeft = attempt < MAX_RETRIES;

      if (!retryable || !hasRetriesLeft) {
        throw error;
      }

      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new Error(`Gemini request failed for model ${model}.`);
}

export async function generateSessionPlan(params: {
  studentName: string;
  subject: string;
  currentLevel: string;
  learningGoals: string;
  weakAreas: string;
  topic: string;
  pastSessions: Array<{
    scheduled_at: string;
    topic: string;
    status: string;
  }>;
}): Promise<SessionPlan> {
  const ai = getGeminiClient();

  if (!ai) {
    throw new Error("Gemini API key is not configured.");
  }

  const pastSessionsText =
    params.pastSessions.length > 0
      ? params.pastSessions
          .map(
            (session) =>
              `- ${session.scheduled_at}: ${session.topic} (${session.status})`
          )
          .join("\n")
      : "No previous sessions available.";

  const prompt = `
You are an expert private tutor planning a focused tutoring session.

Create a personalized lesson plan using the student's profile and previous tutoring history.

STUDENT PROFILE
Name: ${params.studentName}
Subject: ${params.subject}
Current level: ${params.currentLevel}
Learning goals: ${params.learningGoals}
Weak areas: ${params.weakAreas}

CURRENT SESSION
Topic: ${params.topic}

PREVIOUS SESSIONS
${pastSessionsText}

REQUIREMENTS
1. Create exactly 3 concise learning objectives.
2. Create exactly 4 lesson-outline steps in a logical teaching sequence.
3. Create exactly 3 practice questions appropriate for the student's level.
4. Personalize the plan to the student's learning goals and weak areas.
5. Use previous session topics to avoid unnecessary repetition and build on prior learning.
6. Keep all content practical and suitable for a one-on-one tutoring session.
7. Return only the requested structured JSON data.
`;

  let response;

  try {
    // Primary model.
    response = await generateWithRetry(
      ai,
      PRIMARY_GEMINI_MODEL,
      prompt
    );
  } catch (primaryError) {
    // Only use the fallback for transient API availability/rate-limit
    // errors. Non-transient errors should still surface immediately.
    if (!isRetryableError(primaryError)) {
      throw primaryError;
    }

    try {
      // Fallback model.
      response = await generateWithRetry(
        ai,
        FALLBACK_GEMINI_MODEL,
        prompt
      );
    } catch (fallbackError) {
      console.error(
        `Primary Gemini model "${PRIMARY_GEMINI_MODEL}" failed:`,
        primaryError
      );

      console.error(
        `Fallback Gemini model "${FALLBACK_GEMINI_MODEL}" failed:`,
        fallbackError
      );

      throw fallbackError;
    }
  }

  if (!response.text) {
    throw new Error("Gemini returned an empty response.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("objectives" in parsed) ||
    !("lesson_outline" in parsed) ||
    !("practice_questions" in parsed)
  ) {
    throw new Error("Gemini returned an invalid session plan.");
  }

  const plan = parsed as SessionPlan;

  if (
    !Array.isArray(plan.objectives) ||
    plan.objectives.length !== 3 ||
    !plan.objectives.every(
      (item) => typeof item === "string" && item.trim().length > 0
    ) ||
    !Array.isArray(plan.lesson_outline) ||
    plan.lesson_outline.length !== 4 ||
    !plan.lesson_outline.every(
      (item) => typeof item === "string" && item.trim().length > 0
    ) ||
    !Array.isArray(plan.practice_questions) ||
    plan.practice_questions.length !== 3 ||
    !plan.practice_questions.every(
      (item) => typeof item === "string" && item.trim().length > 0
    )
  ) {
    throw new Error(
      "Gemini returned an incorrectly structured session plan."
    );
  }

  return plan;
}