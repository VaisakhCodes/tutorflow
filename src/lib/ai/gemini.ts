import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = "gemini-3.7-flash";

export type SessionPlan = {
  objectives: string[];
  lesson_outline: string[];
  practice_questions: string[];
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

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
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
        },
    },
    });

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
    !Array.isArray(plan.lesson_outline) ||
    plan.lesson_outline.length !== 4 ||
    !Array.isArray(plan.practice_questions) ||
    plan.practice_questions.length !== 3
  ) {
    throw new Error("Gemini returned an incorrectly structured session plan.");
  }

  return plan;
}